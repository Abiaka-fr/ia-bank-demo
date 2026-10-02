"""Regression tests for the 2026-10-02 code review fixes (in-memory SQLite, no network)."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.deps import require_admin, require_writer
from app.core.security import hash_password, verify_password
from app.db.base import Base
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.extraction_job import ExtractionJob
from app.models.mapping import RequirementProcedureMap
from app.models.requirement import RegulatoryRequirement
from app.routers.auth import signup
from app.routers.documents import delete_document, list_document_history
from app.routers.mappings import get_requirements_with_procedures, update_mapping_human_status
from app.routers.requirements import extract_requirements, process_extraction_job
from app.schemas.mapping import HumanStatusUpdate, ModificationLocation, SuggestedModification
from app.schemas.requirement import ExtractRequirementsRequest
from app.schemas.user import UserCreate
from app.services import procedure_ingestion, requirement_procedure_mapping
from app.services.document_versioning import apply_modifications
from app.services.requirement_extraction import RequirementExtractionService, RequirementInput
from app.services.requirement_procedure_mapping import (
    MappingAssessment,
    RequirementProcedureMappingService,
)

USER = SimpleNamespace(user_id="USR-REVIEWER", role="COMPLIANCE_OFFICER")


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Document(document_id="REG-T", title="Regulation", category="EXTERNAL",
                     document_type="REGULATORY_STANDARD", domain="KYC", language="EN",
                     current_version="1.0"),
            DocumentVersion(version_id="VER-REG-T-01", document_id="REG-T", version_no="1.0",
                            status="ACTIVE"),
            DocumentChunk(chunk_id="R1", document_id="REG-T", version_id="VER-REG-T-01",
                          chunk_no=1, content="Customers must be identified."),
            DocumentChunk(chunk_id="R2", document_id="REG-T", version_id="VER-REG-T-01",
                          chunk_no=2, content="Records are kept five years."),
            Document(document_id="PROC-T", title="KYC procedure", category="INTERNAL",
                     document_type="PROCEDURE", domain="KYC", language="EN",
                     current_version="1.0", assignee="USR-UPLOADER"),
            DocumentVersion(version_id="VER-PROC-T-01", document_id="PROC-T", version_no="1.0",
                            status="ACTIVE"),
            DocumentChunk(chunk_id="P1", document_id="PROC-T", version_id="VER-PROC-T-01",
                          chunk_no=1, content="Identity is checked at onboarding."),
            RegulatoryRequirement(requirement_id="REQ-A", source_document_id="REG-T",
                                  title="Identify customers", domain="KYC", risk_level="HIGH"),
            RegulatoryRequirement(requirement_id="REQ-B", source_document_id="REG-T",
                                  title="Keep records", domain="KYC", risk_level="LOW"),
        ]
    )
    session.commit()
    yield session
    session.close()


def modification(original: str, new: str, start: int = 0) -> SuggestedModification:
    return SuggestedModification(
        location=ModificationLocation(chunk_no=1, start_offset=start, end_offset=start + len(original)),
        original_text=original,
        new_text=new,
    )


# --- apply_modifications: "already applied" must not hide a modification never applied ------

def test_shortened_sentence_is_applied():
    # The new text is contained in the original: it was skipped as "already applied".
    text = "Reviewed once a year or upon request."
    result = apply_modifications({1: text}, [modification(text, "Reviewed once a year.")])
    assert result == {1: "Reviewed once a year."}


def test_extended_sentence_is_applied_once():
    extended = modification("Reviewed once a year.", "Reviewed once a year. Results are logged.")
    once = apply_modifications({1: "Reviewed once a year."}, [extended])
    assert once == {1: "Reviewed once a year. Results are logged."}
    assert apply_modifications(once, [extended]) == once


def test_new_text_present_elsewhere_does_not_skip_the_modification():
    text = "Scope: all clients. Reviewed once a year. Applies to all clients."
    start = text.index("Reviewed once a year.")
    result = apply_modifications(
        {1: text}, [modification("Reviewed once a year.", "Applies to all clients.", start)]
    )
    assert result == {1: "Scope: all clients. Applies to all clients. Applies to all clients."}


# --- deleting a procedure --------------------------------------------------------------

def test_deleting_a_procedure_removes_the_mappings_pointing_at_it(db):
    db.add(RequirementProcedureMap(mapping_id="MAP-1", requirement_id="REQ-A",
                                   procedure_id="PROC-T", human_status="PENDING_REVIEW"))
    db.commit()

    response = delete_document("PROC-T", USER, db)

    assert response.deleted_counts["requirement_mappings"] == 1
    assert db.query(RequirementProcedureMap).count() == 0
    assert db.get(RegulatoryRequirement, "REQ-A") is not None  # the regulation is untouched


# --- extraction jobs -------------------------------------------------------------------

def test_extract_is_idempotent_and_returns_the_jobs_still_to_process(db):
    payload = ExtractRequirementsRequest(document_id="REG-T")
    first = extract_requirements(payload, USER, db)
    assert first.total_jobs_created == 2

    done = db.query(ExtractionJob).filter(ExtractionJob.chunk_no == 1).one()
    done.status = "COMPLETED"
    db.commit()
    second = extract_requirements(payload, USER, db)

    assert db.query(ExtractionJob).count() == 2  # no second series
    assert second.total_jobs_created == 0
    assert [job.chunk_no for job in second.jobs] == [2]


def test_processing_a_job_stores_requirements_and_status_together(db, monkeypatch):
    extracted = RequirementInput(
        title="Identify", requirement_text="Identify customers", title_lang_fr="Identifier",
        requirement_text_lang_fr="Identifier les clients", risk_level="HIGH",
        source_reference="1", domain="KYC", evidence="Customers must be identified.",
    )
    monkeypatch.setattr(
        RequirementExtractionService, "_extract_from_chunk",
        staticmethod(lambda chunk: (chunk.chunk_no, [extracted], None)),
    )
    job = extract_requirements(ExtractRequirementsRequest(document_id="REG-T"), USER, db).jobs[0]

    result = process_extraction_job(job.job_id, USER, db)

    assert result.status == "COMPLETED" and len(result.extracted_requirement_ids) == 1
    assert db.get(ExtractionJob, job.job_id).status == "COMPLETED"
    with pytest.raises(HTTPException) as error:  # never extracted twice
        process_extraction_job(job.job_id, USER, db)
    assert error.value.status_code == 400
    assert db.query(RegulatoryRequirement).count() == 3


# --- impact analysis -----------------------------------------------------------------------

def test_analysis_keeps_an_assessment_without_modification_and_never_duplicates(db, monkeypatch):
    calls = []

    def fake_llm(messages, response_schema, **kwargs):
        calls.append(1)
        return MappingAssessment(
            assessment="COVERED", confidence=0.9, explanation="Already covered.",
            explanation_lang_fr="Déjà couvert.", recommended_action="None.",
            recommended_action_lang_fr="Aucune.", suggested_modifications=[],
        )

    monkeypatch.setattr(requirement_procedure_mapping.LLMClient, "call", staticmethod(fake_llm))

    [first] = RequirementProcedureMappingService.analyze(db, ["REQ-A"])
    [second] = RequirementProcedureMappingService.analyze(db, ["REQ-A"])

    mapping = db.query(RequirementProcedureMap).one()
    assert (mapping.assessment, mapping.suggested_modifications) == ("COVERED", None)
    assert first.mappings_created == 1
    assert second.mappings_created == 0 and "already analysed" in second.warnings[0]
    assert len(calls) == 1  # the second run does not call the LLM again


def test_requirements_to_procedures_groups_mappings_per_requirement(db):
    db.add(RequirementProcedureMap(mapping_id="MAP-1", requirement_id="REQ-A",
                                   procedure_id="PROC-T", assessment="POTENTIAL_GAP"))
    db.commit()

    response = get_requirements_with_procedures(["REQ-A", "REQ-B"], None, None, USER, db)

    by_id = {item.requirement.requirement_id: item for item in response.data}
    assert response.total_mappings == 1
    assert by_id["REQ-A"].procedures[0]["procedure"].name == "KYC procedure"
    assert by_id["REQ-B"].procedures == []


def test_escalation_is_recorded_in_the_procedure_history(db):
    db.add(RequirementProcedureMap(mapping_id="MAP-1", requirement_id="REQ-A",
                                   procedure_id="PROC-T", human_status="PENDING_REVIEW"))
    db.commit()

    payload = HumanStatusUpdate(human_status="ESCALATE", assignee="USR-SENIOR")
    update_mapping_human_status("MAP-1", payload, USER, db)

    [entry] = list_document_history("PROC-T", USER, db)
    assert (entry.from_assignee, entry.to_assignee, entry.actor) == (
        "USR-UPLOADER", "USR-SENIOR", "USR-REVIEWER",
    )


# --- accounts and roles ----------------------------------------------------------------------

def test_signup_always_creates_a_compliance_officer(db):
    payload = UserCreate.model_validate(
        {"email": "new@iabank.fr", "password": "long-enough", "role": "COMPLIANCE_ADMIN"}
    )
    assert signup(payload, db).user.role == "COMPLIANCE_OFFICER"


def test_password_longer_than_bcrypt_accepts_is_rejected_not_crashed():
    with pytest.raises(ValidationError):
        UserCreate(email="new@iabank.fr", password="x" * 73)
    assert verify_password("x" * 73, hash_password("short-password")) is False


@pytest.mark.parametrize("role", ["COMPLIANCE_ADMIN", "Admin Base de Connaissances"])
def test_admin_roles_may_change_roles(role):
    assert require_admin(SimpleNamespace(role=role)).role == role


def test_other_roles_may_not_change_roles():
    with pytest.raises(HTTPException) as error:
        require_admin(SimpleNamespace(role="COMPLIANCE_OFFICER"))
    assert error.value.status_code == 403


@pytest.mark.parametrize("role", ["AUDITOR", "Auditeur Interne"])
def test_auditors_are_read_only(role):
    with pytest.raises(HTTPException) as error:
        require_writer(SimpleNamespace(role=role))
    assert error.value.status_code == 403
    assert require_writer(USER) is USER


# --- ingestion ---------------------------------------------------------------------------

def test_an_internal_procedure_is_not_attributed_to_the_european_union(db, monkeypatch):
    chunk = SimpleNamespace(chunk_no=1, section_title="Section 1", content="Text", token_count=1)
    monkeypatch.setattr(
        procedure_ingestion, "TokenBasedChunker",
        lambda max_tokens: SimpleNamespace(chunk=lambda text, language, domain: [chunk]),
    )

    result = procedure_ingestion.ProcedureIngestionService.ingest(
        db, text="Text", title="Procedure", domain="KYC", language="EN", created_by="USR-1",
    )

    assert (result.origin_code, result.origin_name) == ("BANK", "Demo Bank")
    # Generated ids are longer than a ULID: the columns must take them.
    assert len(db.get(Document, result.document_id).versions[0].version_id) == 33
