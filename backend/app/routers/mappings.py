"""Requirement-Procedure mapping endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.mapping import RequirementProcedureMap
from app.models.procedure import Procedure
from app.models.requirement import RegulatoryRequirement
from app.models.user import User
from app.schemas.mapping import (
    AssigneeUpdate,
    HumanStatusEnum,
    HumanStatusUpdate,
    MappingListResponse,
    MappingRead,
    NestedMappingResponse,
    NestedMappingResponseByProcedure,
    ProcedureRead,
    ProcedureWithRequirementsRead,
    RequirementRead,
    RequirementWithProceduresRead,
)

router = APIRouter(prefix="/api/mappings", tags=["mappings"])


@router.get("/requirements-to-procedures", response_model=NestedMappingResponse)
def get_requirements_with_procedures(
    requirement_ids: list[str] = Query(..., description="List of requirement IDs"),
    assessment: str | None = Query(None, description="Filter by assessment status"),
    risk_level: str | None = Query(None, description="Filter requirements by risk level"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NestedMappingResponse:
    """
    Get nested map: requirements with all procedures they map to.

    Returns a hierarchical structure showing each requirement and the procedures that address it.

    **Query Parameters:**
    - `requirement_ids` (required, list): List of requirement IDs to expand
      Example: `?requirement_ids=REQ-0001&requirement_ids=REQ-0002`
    - `assessment` (optional): Filter mappings by assessment (COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW)
    - `risk_level` (optional): Filter requirements by risk level (LOW, MEDIUM, HIGH)

    **Example URLs:**
    - `/api/mappings/requirements-to-procedures?requirement_ids=REQ-0001`
    - `/api/mappings/requirements-to-procedures?requirement_ids=REQ-0001&requirement_ids=REQ-0002&assessment=COVERED`
    - `/api/mappings/requirements-to-procedures?requirement_ids=REQ-0001&risk_level=HIGH`
    """
    if not requirement_ids or len(requirement_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one requirement_id is required")

    query = db.query(RegulatoryRequirement).filter(
        RegulatoryRequirement.requirement_id.in_(requirement_ids)
    )

    if risk_level:
        query = query.filter(RegulatoryRequirement.risk_level == risk_level)

    requirements = query.all()

    result_data = []
    total_mappings = 0

    for req in requirements:
        mapping_query = db.query(RequirementProcedureMap).filter(
            RequirementProcedureMap.requirement_id == req.requirement_id
        )

        if assessment:
            mapping_query = mapping_query.filter(RequirementProcedureMap.assessment == assessment)

        mappings = mapping_query.all()
        total_mappings += len(mappings)

        procedures_list = []
        for mapping in mappings:
            procedures_list.append(
                {
                    "procedure": ProcedureRead.model_validate(mapping.procedure),
                    "mapping": MappingRead.model_validate(mapping),
                }
            )

        result_data.append(
            RequirementWithProceduresRead(
                requirement=RequirementRead.model_validate(req),
                procedures=procedures_list,
                total_procedures=len(procedures_list),
            )
        )

    return NestedMappingResponse(
        total_requirements=len(requirements),
        total_mappings=total_mappings,
        data=result_data,
    )


@router.get("/procedures-to-requirements", response_model=NestedMappingResponseByProcedure)
def get_procedures_with_requirements(
    procedure_ids: list[str] = Query(..., description="List of procedure IDs"),
    assessment: str | None = Query(None, description="Filter by assessment status"),
    domain: str | None = Query(None, description="Filter requirements by domain"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NestedMappingResponseByProcedure:
    """
    Get nested map: procedures with all requirements they address.

    Returns a hierarchical structure showing each procedure and the requirements it covers.

    **Query Parameters:**
    - `procedure_ids` (required, list): List of procedure IDs to expand
      Example: `?procedure_ids=PROC-0001&procedure_ids=PROC-0002`
    - `assessment` (optional): Filter mappings by assessment (COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW)
    - `domain` (optional): Filter requirements by domain (AML/CFT, KYC, etc.)

    **Example URLs:**
    - `/api/mappings/procedures-to-requirements?procedure_ids=PROC-AML-001`
    - `/api/mappings/procedures-to-requirements?procedure_ids=PROC-AML-001&assessment=COVERED`
    - `/api/mappings/procedures-to-requirements?procedure_ids=PROC-KYC-002&domain=KYC`
    """
    if not procedure_ids or len(procedure_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one procedure_id is required")

    query = db.query(Procedure).filter(Procedure.procedure_id.in_(procedure_ids))
    procedures = query.all()

    result_data = []
    total_mappings = 0

    for proc in procedures:
        mapping_query = db.query(RequirementProcedureMap).filter(
            RequirementProcedureMap.procedure_id == proc.procedure_id
        )

        if assessment:
            mapping_query = mapping_query.filter(RequirementProcedureMap.assessment == assessment)

        mappings = mapping_query.all()
        total_mappings += len(mappings)

        requirements_list = []
        for mapping in mappings:
            req = mapping.requirement

            if domain and req.domain != domain:
                continue

            requirements_list.append(
                {
                    "requirement": RequirementRead.model_validate(req),
                    "mapping": MappingRead.model_validate(mapping),
                }
            )

        result_data.append(
            ProcedureWithRequirementsRead(
                procedure=ProcedureRead.model_validate(proc),
                requirements=requirements_list,
                total_requirements=len(requirements_list),
            )
        )

    return NestedMappingResponseByProcedure(
        total_procedures=len(procedures),
        total_mappings=total_mappings,
        data=result_data,
    )


@router.get("/all", response_model=MappingListResponse)
def list_mappings(
    requirement_id: str | None = Query(None, description="Filter by requirement ID"),
    procedure_id: str | None = Query(None, description="Filter by procedure ID"),
    assessment: str | None = Query(None, description="Filter by assessment status"),
    human_status: str | None = Query(None, description="Filter by human review status"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MappingListResponse:
    """
    Get a flat list of all requirement-procedure mappings with optional filters.

    **Query Parameters:**
    - `requirement_id` (optional): Filter by specific requirement
    - `procedure_id` (optional): Filter by specific procedure
    - `assessment` (optional): Filter by assessment (COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW)
    - `human_status` (optional): Filter by human status (PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED)
    - `limit`: Max results per page (default 50, max 200)
    - `offset`: Skip N results for pagination

    **Example URLs:**
    - `/api/mappings/all?requirement_id=REQ-0001`
    - `/api/mappings/all?procedure_id=PROC-AML-001`
    - `/api/mappings/all?assessment=POTENTIAL_GAP&limit=100`
    - `/api/mappings/all?human_status=PENDING_REVIEW`
    """
    query = db.query(RequirementProcedureMap)

    if requirement_id:
        query = query.filter(RequirementProcedureMap.requirement_id == requirement_id)
    if procedure_id:
        query = query.filter(RequirementProcedureMap.procedure_id == procedure_id)
    if assessment:
        query = query.filter(RequirementProcedureMap.assessment == assessment)
    if human_status:
        query = query.filter(RequirementProcedureMap.human_status == human_status)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return MappingListResponse(
        total=total,
        items=[MappingRead.model_validate(item) for item in items],
        limit=limit,
        offset=offset,
    )


@router.put("/{mapping_id}/human-status", response_model=MappingRead)
def update_mapping_human_status(
    mapping_id: str,
    payload: HumanStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MappingRead:
    """
    Update the human review status of a requirement-procedure mapping.

    **Path Parameters:**
    - `mapping_id`: The ID of the mapping to update (e.g., MAP-0001)

    **Request Body:**
    - `human_status` (required): One of PENDING_REVIEW, ESCALATE, ACCEPT, REJECT

    **Allowed Values:**
    - `PENDING_REVIEW` — Awaiting human review (default)
    - `ESCALATE` — Escalate to senior review/approval
    - `ACCEPT` — Approved by human reviewer
    - `REJECT` — Rejected by human reviewer

    **Example URLs:**
    - `PUT /api/mappings/MAP-0001/human-status`

    **Example Request:**
    ```json
    {"human_status": "ACCEPT"}
    ```
    """
    # Validate human_status value
    if payload.human_status not in HumanStatusEnum.ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid human_status. Allowed values: {', '.join(HumanStatusEnum.ALLOWED)}",
        )

    mapping = db.get(RequirementProcedureMap, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")

    mapping.human_status = payload.human_status
    db.commit()
    db.refresh(mapping)

    return MappingRead.model_validate(mapping)


@router.put("/{mapping_id}/assignee", response_model=MappingRead)
def update_mapping_assignee(
    mapping_id: str,
    payload: AssigneeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MappingRead:
    """
    Update the assignee of a requirement-procedure mapping.

    **Path Parameters:**
    - `mapping_id`: The ID of the mapping to update (e.g., MAP-0001)

    **Request Body:**
    - `assignee` (optional): User ID or email to assign (null to clear assignment)

    **Example URLs:**
    - `PUT /api/mappings/MAP-0001/assignee`

    **Example Requests:**
    ```json
    {"assignee": "compliance.officer@bank.com"}
    ```
    or to clear:
    ```json
    {"assignee": null}
    ```
    """
    mapping = db.get(RequirementProcedureMap, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")

    mapping.assignee = payload.assignee
    db.commit()
    db.refresh(mapping)

    return MappingRead.model_validate(mapping)
