"""Dashboard schemas."""

from pydantic import BaseModel

from app.schemas.document import DocumentRead
from app.schemas.mapping import RequirementWithProceduresRead
from app.schemas.requirement import RegulatoryRequirementRead


class PortfolioResponse(BaseModel):
    """Every regulation with its requirements and their mappings."""

    documents: list[DocumentRead]
    requirements: list[RegulatoryRequirementRead]
    mappings: list[RequirementWithProceduresRead]
    # mapping_id -> who the mapping is currently escalated to
    escalation_assignees: dict[str, str]
