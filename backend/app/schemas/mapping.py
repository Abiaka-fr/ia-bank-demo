"""Pydantic schemas for requirement-procedure mappings."""

from pydantic import BaseModel


class MappingRead(BaseModel):
    """A single requirement-procedure mapping."""

    mapping_id: str
    requirement_id: str
    procedure_id: str
    assessment: str | None = None
    confidence: float | None = None
    explanation: str | None = None
    recommended_action: str | None = None
    explanation_lang_fr: str | None = None
    recommended_action_lang_fr: str | None = None
    human_status: str | None = None
    assignee: str | None = None

    class Config:
        from_attributes = True


class ProcedureRead(BaseModel):
    """Procedure data (minimal for nested responses)."""

    procedure_id: str
    document_id: str
    name: str | None = None
    domain: str | None = None
    owner: str | None = None
    status: str | None = None
    current_version: str | float | None = None

    model_config = {"from_attributes": True}


class RequirementRead(BaseModel):
    """Requirement data (minimal for nested responses)."""

    requirement_id: str
    source_document_id: str
    title: str | None = None
    domain: str | None = None
    language: str | None = None
    risk_level: str | None = None
    source_reference: str | None = None
    status: str | None = None

    class Config:
        from_attributes = True


class RequirementWithProceduresRead(BaseModel):
    """A requirement with all procedures it maps to."""

    requirement: RequirementRead
    procedures: list[dict]  # Each item: {procedure, mapping}
    total_procedures: int


class ProcedureWithRequirementsRead(BaseModel):
    """A procedure with all requirements it covers."""

    procedure: ProcedureRead
    requirements: list[dict]  # Each item: {requirement, mapping}
    total_requirements: int


class NestedMappingResponse(BaseModel):
    """Nested mapping structure: requirements with their procedures."""

    total_requirements: int
    total_mappings: int
    data: list[RequirementWithProceduresRead]


class NestedMappingResponseByProcedure(BaseModel):
    """Nested mapping structure: procedures with their requirements."""

    total_procedures: int
    total_mappings: int
    data: list[ProcedureWithRequirementsRead]


class MappingListResponse(BaseModel):
    """Paginated list of mappings."""

    total: int
    items: list[MappingRead]
    limit: int
    offset: int


class HumanStatusUpdate(BaseModel):
    """Update human review status of a mapping."""

    human_status: str

    class Config:
        json_schema_extra = {
            "example": {"human_status": "ACCEPT"}
        }


class AssigneeUpdate(BaseModel):
    """Update assignee of a mapping."""

    assignee: str | None = None

    class Config:
        json_schema_extra = {
            "example": {"assignee": "compliance.officer@bank.com"}
        }


class HumanStatusEnum:
    """Allowed values for human_status field."""

    PENDING_REVIEW = "PENDING_REVIEW"
    ESCALATE = "ESCALATE"
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"

    ALLOWED = [PENDING_REVIEW, ESCALATE, ACCEPT, REJECT]
