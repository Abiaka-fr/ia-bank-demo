"""Dashboard endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.document import Document
from app.models.mapping import MappingHistory
from app.models.requirement import RegulatoryRequirement
from app.models.user import User
from app.routers.mappings import nest_procedures
from app.schemas.dashboard import PortfolioResponse
from app.schemas.document import DocumentRead
from app.schemas.mapping import HumanStatusEnum
from app.schemas.requirement import RegulatoryRequirementRead

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioResponse:
    """
    Every regulation (document of category EXTERNAL) with its requirements and their
    mappings, in one response.

    Same items as `GET /api/documents?category=EXTERNAL`, `GET /api/requirements/by-documents`
    and `GET /api/mappings/requirements-to-procedures`. The dashboard called them one after
    the other: three round trips, each paying the per-request cost of a remote database.
    """
    documents = (
        db.query(Document)
        .filter(Document.category == "EXTERNAL")
        .order_by(Document.created_at, Document.document_id)
        .all()
    )
    requirements = (
        db.query(RegulatoryRequirement)
        .filter(
            RegulatoryRequirement.source_document_id.in_([doc.document_id for doc in documents])
        )
        .order_by(RegulatoryRequirement.created_at, RegulatoryRequirement.requirement_id)
        .all()
    )
    mappings, _ = nest_procedures(db, requirements)

    # `MappingRead` has no assignee: who an escalation went to is only in the history, on
    # the latest ESCALATE row of the mapping.
    escalated_ids = [
        item["mapping"].mapping_id
        for requirement in mappings
        for item in requirement.procedures
        if item["mapping"].human_status == HumanStatusEnum.ESCALATE
    ]
    escalation_assignees: dict[str, str] = {}
    if escalated_ids:
        rows = (
            db.query(MappingHistory)
            .filter(
                MappingHistory.mapping_id.in_(escalated_ids),
                MappingHistory.to_status == HumanStatusEnum.ESCALATE,
            )
            .order_by(MappingHistory.created_at.desc())
            .all()
        )
        for row in rows:
            if row.assignee:
                escalation_assignees.setdefault(row.mapping_id, row.assignee)

    return PortfolioResponse(
        documents=[DocumentRead.model_validate(doc) for doc in documents],
        requirements=[RegulatoryRequirementRead.model_validate(req) for req in requirements],
        mappings=mappings,
        escalation_assignees=escalation_assignees,
    )
