"""Pydantic schemas for regulatory requirements."""

from pydantic import BaseModel


class RegulatoryRequirementRead(BaseModel):
    """Regulatory requirement data returned to the client."""

    requirement_id: str
    source_document_id: str
    title: str | None = None
    domain: str | None = None
    language: str | None = None
    requirement_text: str | None = None
    risk_level: str | None = None
    source_reference: str | None = None
    status: str | None = None

    class Config:
        from_attributes = True


class RequirementsListResponse(BaseModel):
    """Paginated list of regulatory requirements."""

    total: int
    items: list[RegulatoryRequirementRead]
    limit: int
    offset: int
    document_ids_queried: list[str]
