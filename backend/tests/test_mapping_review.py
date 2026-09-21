"""Reject / accept / escalate a finding via PUT /api/mappings/{id}/human-status (in-memory SQLite)."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.mapping import RequirementProcedureMap
from app.routers.mappings import update_mapping_human_status
from app.schemas.mapping import HumanStatusUpdate

USER = SimpleNamespace(user_id="USR-REVIEWER")
MODIFICATION = {
    "location": {"chunk_no": 2, "start_offset": 10, "end_offset": 22},
    "original_text": "once a year.",
    "new_text": "every six months.",
}


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Document(document_id="INT-T-001", title="KYC procedure", document_type="PROCEDURE",
                     current_version="1.0", assignee="USR-UPLOADER"),
            DocumentVersion(version_id="VER-INT-T-001-01", document_id="INT-T-001", version_no="1.0",
                            status="ACTIVE"),
            DocumentChunk(chunk_id="C1", document_id="INT-T-001", version_id="VER-INT-T-001-01",
                          chunk_no=1, section_title="Scope", content="Applies to all clients."),
            DocumentChunk(chunk_id="C2", document_id="INT-T-001", version_id="VER-INT-T-001-01",
                          chunk_no=2, section_title="Review", content="Reviewed once a year."),
            RequirementProcedureMap(mapping_id="MAP-T-1", requirement_id="REQ-T-1",
                                    procedure_id="INT-T-001", human_status="PENDING_REVIEW",
                                    suggested_modifications=[MODIFICATION]),
        ]
    )
    session.commit()
    yield session
    session.close()


def decide(db, status, assignee=None):
    payload = HumanStatusUpdate(human_status=status, assignee=assignee)
    return update_mapping_human_status("MAP-T-1", payload, USER, db)


def test_reject_only_changes_status(db):
    assert decide(db, "REJECT").human_status == "REJECT"
    assert db.get(Document, "INT-T-001").current_version == "1.0"


def test_accept_creates_new_procedure_version(db):
    assert decide(db, "ACCEPT").human_status == "ACCEPT"

    assert db.get(Document, "INT-T-001").current_version == "2.0"
    assert db.get(DocumentVersion, "VER-INT-T-001-01").status == "SUPERSEDED"
    new_version = db.get(DocumentVersion, "VER-INT-T-001-02")
    assert (new_version.status, new_version.created_by) == ("ACTIVE", "USR-REVIEWER")
    contents = {c.chunk_no: c.content for c in new_version.chunks}
    assert contents == {1: "Applies to all clients.", 2: "Reviewed every six months."}

    # Accepting again must not stack another version.
    decide(db, "ACCEPT")
    assert db.get(Document, "INT-T-001").current_version == "2.0"


def test_accept_fails_when_procedure_text_changed(db):
    db.get(DocumentChunk, "C2").content = "Rewritten entirely."
    db.commit()
    with pytest.raises(HTTPException) as error:
        decide(db, "ACCEPT")
    assert error.value.status_code == 409


def test_escalate_requires_and_stores_assignee(db):
    with pytest.raises(HTTPException) as error:
        decide(db, "ESCALATE")
    assert error.value.status_code == 400

    assert decide(db, "ESCALATE", assignee="USR-SENIOR").human_status == "ESCALATE"
    assert db.get(Document, "INT-T-001").assignee == "USR-SENIOR"
