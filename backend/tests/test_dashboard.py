"""GET /api/dashboard/portfolio (in-memory SQLite, no network)."""

from datetime import datetime
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import Document
from app.models.mapping import MappingHistory, RequirementProcedureMap
from app.models.requirement import RegulatoryRequirement
from app.routers.dashboard import get_portfolio

USER = SimpleNamespace(user_id="USR-REVIEWER", role="COMPLIANCE_OFFICER")


def day(n: int) -> datetime:
    return datetime(2026, 10, n)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Document(document_id="REG-A", title="Regulation A", category="EXTERNAL",
                     created_at=day(1)),
            Document(document_id="REG-B", title="Regulation B", category="EXTERNAL",
                     created_at=day(2)),
            Document(document_id="PROC-T", title="KYC procedure", category="INTERNAL",
                     created_at=day(3)),
            RegulatoryRequirement(requirement_id="REQ-A", source_document_id="REG-A",
                                  title="Identify customers", created_at=day(1)),
            RegulatoryRequirement(requirement_id="REQ-B", source_document_id="REG-B",
                                  title="Keep records", created_at=day(2)),
            RequirementProcedureMap(mapping_id="MAP-1", requirement_id="REQ-A",
                                    procedure_id="PROC-T", assessment="POTENTIAL_GAP",
                                    human_status="ESCALATE"),
            RequirementProcedureMap(mapping_id="MAP-2", requirement_id="REQ-B",
                                    procedure_id="PROC-T", assessment="COVERED",
                                    human_status="ACCEPT"),
            # MAP-1 was escalated twice: the latest row wins.
            MappingHistory(mapping_id="MAP-1", requirement_id="REQ-A", to_status="ESCALATE",
                           assignee="USR-OLD", created_at=day(4)),
            MappingHistory(mapping_id="MAP-1", requirement_id="REQ-A", to_status="ESCALATE",
                           assignee="USR-NEW", created_at=day(5)),
            # MAP-2 was escalated, then accepted: no longer escalated to anyone.
            MappingHistory(mapping_id="MAP-2", requirement_id="REQ-B", to_status="ESCALATE",
                           assignee="USR-GONE", created_at=day(4)),
            MappingHistory(mapping_id="MAP-2", requirement_id="REQ-B", to_status="ACCEPT",
                           created_at=day(5)),
        ]
    )
    session.commit()
    yield session
    session.close()


def test_portfolio_returns_every_regulation_with_its_requirements_and_mappings(db):
    portfolio = get_portfolio(current_user=USER, db=db)

    # Regulations only: the procedure is not listed as a document.
    assert [doc.document_id for doc in portfolio.documents] == ["REG-A", "REG-B"]
    assert [(req.requirement_id, req.source_document_id) for req in portfolio.requirements] == [
        ("REQ-A", "REG-A"),
        ("REQ-B", "REG-B"),
    ]
    assert {
        item.requirement.requirement_id: [
            (entry["procedure"].procedure_id, entry["mapping"].mapping_id)
            for entry in item.procedures
        ]
        for item in portfolio.mappings
    } == {"REQ-A": [("PROC-T", "MAP-1")], "REQ-B": [("PROC-T", "MAP-2")]}
    assert portfolio.escalation_assignees == {"MAP-1": "USR-NEW"}


def test_portfolio_is_empty_without_any_regulation(db):
    db.query(Document).filter(Document.category == "EXTERNAL").delete()
    db.commit()

    portfolio = get_portfolio(current_user=USER, db=db)

    assert (portfolio.documents, portfolio.requirements, portfolio.mappings) == ([], [], [])
    assert portfolio.escalation_assignees == {}
