"""Reject / accept / escalate a finding via PUT /api/mappings/{id}/human-status (in-memory SQLite)."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.mapping import MappingHistory, RequirementProcedureMap
from app.routers.documents import list_document_versions
from app.routers.mappings import list_mapping_history, update_mapping_human_status
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


def decide(db, status, assignee=None, comment=None):
    payload = HumanStatusUpdate(human_status=status, assignee=assignee, comment=comment)
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

    # Accepting again, even after another decision in between, must not apply twice.
    decide(db, "ACCEPT")
    decide(db, "REJECT")
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


def test_each_decision_is_recorded_in_history(db):
    decide(db, "ESCALATE", assignee="USR-SENIOR", comment="Needs legal review")
    decide(db, "ACCEPT")
    with pytest.raises(HTTPException):
        decide(db, "ESCALATE")  # rejected request: nothing recorded

    # Sorted here: both rows can share a timestamp at this speed (newest-first is the API order).
    history = sorted(list_mapping_history(["REQ-T-1"], USER, db), key=lambda h: h.to_status)
    assert [(h.from_status, h.to_status) for h in history] == [
        ("ESCALATE", "ACCEPT"),
        ("PENDING_REVIEW", "ESCALATE"),
    ]
    accept, escalate = history
    assert (escalate.assignee, escalate.comment, escalate.actor) == (
        "USR-SENIOR", "Needs legal review", "USR-REVIEWER",
    )
    assert accept.new_version_id == "VER-INT-T-001-02"
    assert list_mapping_history(["REQ-OTHER"], USER, db) == []
    assert db.query(MappingHistory).count() == 2


def test_document_versions_are_listed_with_change_reason(db):
    decide(db, "ACCEPT")
    versions = list_document_versions("INT-T-001", USER, db)
    assert [(v.version_id, v.status) for v in versions] == [
        ("VER-INT-T-001-01", "SUPERSEDED"),
        ("VER-INT-T-001-02", "ACTIVE"),
    ]
    assert versions[1].change_reason == "Accepted MAP-T-1 (requirement REQ-T-1)"
