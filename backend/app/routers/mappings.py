"""Requirement-Procedure mapping endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.mapping import MappingHistory, RequirementProcedureMap
from app.models.requirement import RegulatoryRequirement
from app.models.user import User
from app.schemas.document import DocumentChunkInput
from app.schemas.mapping import (
    AnalyzeMappingsRequest,
    DocumentRead,
    HumanStatusEnum,
    HumanStatusUpdate,
    MappingDetailResponse,
    MappingHistoryRead,
    MappingListResponse,
    MappingRead,
    NestedMappingResponse,
    NestedMappingResponseByProcedure,
    ProcedureRead,
    ProcedureWithRequirementsRead,
    RequirementRead,
    RequirementWithProceduresRead,
)
from app.services.document_versioning import apply_modifications, create_document_version
from app.services.requirement_procedure_mapping import RequirementProcedureMappingService

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
            # Fetch procedure document using procedure_id (which stores document_id)
            procedure_doc = db.query(Document).filter(
                Document.document_id == mapping.procedure_id
            ).first()

            if procedure_doc:
                # Convert Document to ProcedureRead format
                procedure_read = ProcedureRead(
                    procedure_id=procedure_doc.document_id,
                    document_id=procedure_doc.document_id,
                    name=procedure_doc.title,
                    domain=procedure_doc.domain,
                    owner=procedure_doc.assignee,
                    status=None,  # Document doesn't have status, it's in DocumentVersion
                    current_version=procedure_doc.current_version,
                    created_at=procedure_doc.created_at,
                    updated_at=procedure_doc.updated_at,
                )
                procedures_list.append(
                    {
                        "procedure": procedure_read,
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

    # Query procedures from document table (procedure_ids are actually document_ids)
    query = db.query(Document).filter(
        Document.document_id.in_(procedure_ids),
        Document.document_type == "PROCEDURE"
    )
    procedures = query.all()

    result_data = []
    total_mappings = 0

    for proc in procedures:
        mapping_query = db.query(RequirementProcedureMap).filter(
            RequirementProcedureMap.procedure_id == proc.document_id
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

        # Convert Document to ProcedureRead format
        procedure_read = ProcedureRead(
            procedure_id=proc.document_id,
            document_id=proc.document_id,
            name=proc.title,
            domain=proc.domain,
            owner=proc.assignee,
            status=None,  # Document doesn't have status, it's in DocumentVersion
            current_version=proc.current_version,
            created_at=proc.created_at,
            updated_at=proc.updated_at,
        )

        result_data.append(
            ProcedureWithRequirementsRead(
                procedure=procedure_read,
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


@router.get("/history", response_model=list[MappingHistoryRead])
def list_mapping_history(
    requirement_ids: list[str] | None = Query(None, description="Requirement IDs (repeatable)"),
    mapping_id: str | None = Query(None, description="Specific mapping ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MappingHistoryRead]:
    """
    Get decision history for mappings.

    Filter by either requirement_ids (get history for all mappings of those requirements)
    or mapping_id (get history for a specific mapping).

    **Query Parameters:**
    - `requirement_ids` (optional, repeatable): Filter by requirement IDs
    - `mapping_id` (optional): Filter by specific mapping ID

    **Example URLs:**
    - `GET /api/mappings/history?requirement_ids=REQ-0001&requirement_ids=REQ-0002`
    - `GET /api/mappings/history?mapping_id=MAP-0001`

    **Note:** At least one of requirement_ids or mapping_id must be provided.
    """
    if not requirement_ids and not mapping_id:
        raise HTTPException(
            status_code=400,
            detail="At least one of requirement_ids or mapping_id must be provided",
        )

    query = db.query(MappingHistory)

    if mapping_id:
        query = query.filter(MappingHistory.mapping_id == mapping_id)
    elif requirement_ids:
        query = query.filter(MappingHistory.requirement_id.in_(requirement_ids))

    rows = query.order_by(MappingHistory.created_at.desc()).all()
    return [MappingHistoryRead.model_validate(row) for row in rows]


@router.get("/{mapping_id}", response_model=MappingDetailResponse)
def get_mapping_detail(
    mapping_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MappingDetailResponse:
    """
    Get complete details of a requirement-procedure mapping.

    Returns the mapping with all linked data:
    - Mapping details (assessment, confidence, suggested modifications, etc.)
    - Requirement data
    - Source document of the requirement (regulation document)
    - Procedure/document it maps to

    **Path Parameters:**
    - `mapping_id`: The ID of the mapping to retrieve (e.g., MAP-0001)

    **Example URLs:**
    - `GET /api/mappings/MAP-0001`

    **Response:**
    ```json
    {
      "mapping": { mapping details },
      "requirement": { requirement details },
      "requirement_source_document": { regulation document details },
      "procedure": { procedure/document details }
    }
    ```
    """
    mapping = db.get(RequirementProcedureMap, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")

    # Fetch the requirement
    requirement = db.query(RegulatoryRequirement).filter(
        RegulatoryRequirement.requirement_id == mapping.requirement_id
    ).first()
    if requirement is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Fetch the source document (regulation document)
    source_document = db.query(Document).filter(
        Document.document_id == requirement.source_document_id
    ).first()
    if source_document is None:
        raise HTTPException(status_code=404, detail="Source document not found")

    # Fetch the procedure (document with type PROCEDURE)
    procedure_document = db.query(Document).filter(
        Document.document_id == mapping.procedure_id,
        Document.document_type == "PROCEDURE"
    ).first()
    if procedure_document is None:
        raise HTTPException(status_code=404, detail="Procedure document not found")

    # Build the response
    return MappingDetailResponse(
        mapping=MappingRead.model_validate(mapping),
        requirement=RequirementRead.model_validate(requirement),
        requirement_source_document=DocumentRead.model_validate(source_document),
        procedure=ProcedureRead(
            procedure_id=procedure_document.document_id,
            document_id=procedure_document.document_id,
            name=procedure_document.title,
            domain=procedure_document.domain,
            owner=procedure_document.assignee,
            status=None,
            current_version=procedure_document.current_version,
            created_at=procedure_document.created_at,
            updated_at=procedure_document.updated_at,
        ),
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
    - `assignee` (required for ESCALATE): user_id or email of the person escalated to

    **Allowed Values:**
    - `PENDING_REVIEW` — Awaiting human review (default)
    - `ESCALATE` — Escalate to senior review/approval; `assignee` is saved on the
      procedure document (`documents.assignee`)
    - `ACCEPT` — Approved by human reviewer; the mapping's `suggested_modifications` are
      applied to the procedure as a new version (documents.current_version bumped).
      409 if the procedure text no longer contains the original text.
    - `REJECT` — Rejected by human reviewer (status only)

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

    new_version_id = None
    if payload.human_status == HumanStatusEnum.ESCALATE:
        if not payload.assignee:
            raise HTTPException(status_code=400, detail="assignee is required to escalate")
        # ponytail: stored on the procedure document (no assignee column on the mapping);
        # it also overwrites the uploader kept there until a created_by column exists.
        _procedure_document(db, mapping).assignee = payload.assignee
    elif payload.human_status == HumanStatusEnum.ACCEPT and mapping.human_status != HumanStatusEnum.ACCEPT:
        new_version_id = _apply_suggested_modifications(db, mapping, created_by=current_user.user_id)

    db.add(
        MappingHistory(
            mapping_id=mapping.mapping_id,
            requirement_id=mapping.requirement_id,
            procedure_id=mapping.procedure_id,
            from_status=mapping.human_status,
            to_status=payload.human_status,
            assignee=payload.assignee if payload.human_status == HumanStatusEnum.ESCALATE else None,
            new_version_id=new_version_id,
            comment=payload.comment,
            actor=current_user.user_id,
        )
    )
    mapping.human_status = payload.human_status
    db.commit()
    db.refresh(mapping)

    return MappingRead.model_validate(mapping)


def _procedure_document(db: Session, mapping: RequirementProcedureMap) -> Document:
    """`mapping.procedure_id` holds the procedure's document_id."""
    document = db.get(Document, mapping.procedure_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Procedure document not found")
    return document


def _apply_suggested_modifications(
    db: Session, mapping: RequirementProcedureMap, created_by: str
) -> str | None:
    """Accepting a finding applies its suggested modifications as a new procedure version.

    Returns the new version_id, or None when there was nothing to apply.
    """
    modifications = MappingRead.model_validate(mapping).suggested_modifications
    if not modifications:
        return None  # Nothing to change in the procedure text: no identical new version.

    document = _procedure_document(db, mapping)
    active_version = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == document.document_id, DocumentVersion.status == "ACTIVE")
        .order_by(DocumentVersion.version_timestamp.desc())
        .first()
    )
    if active_version is None:
        raise HTTPException(status_code=409, detail="Procedure has no active version")
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.version_id == active_version.version_id)
        .order_by(DocumentChunk.chunk_no.asc())
        .all()
    )

    current = {c.chunk_no: c.content or "" for c in chunks}
    try:
        contents = apply_modifications(current, modifications)
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail=f"Procedure text changed since the analysis, re-run it: {e}",
        ) from e
    if contents == current:
        return None  # Already in the procedure (accepted before): no identical version.

    new_version, _ = create_document_version(
        db,
        document,
        [
            DocumentChunkInput(
                chunk_no=c.chunk_no,
                section_title=c.section_title or "",
                content=contents[c.chunk_no],
                language=c.language or "",
                domain=c.domain or "",
            )
            for c in chunks
        ],
        created_by=created_by,
        change_reason=f"Accepted {mapping.mapping_id} (requirement {mapping.requirement_id})",
    )
    return new_version.version_id


@router.post("/analyze", status_code=201)
def analyze_requirement_impact(
    payload: AnalyzeMappingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze impact of requirements on internal procedures.

    This endpoint takes a list of requirement IDs and uses an LLM to:
    1. For each requirement, find all procedures in the same domain
    2. Assess how the requirement impacts each procedure
    3. Generate suggested modifications if needed
    4. Store RequirementProcedureMap rows with PENDING_REVIEW status

    **Request Body:**
    - `requirement_ids` (required): List of requirement IDs to analyze

    **Response:** List of AnalyzeMappingsResponse, one per requirement

    **Notes:**
    - Requires OpenRouter API key in OPENROUTER_API_KEY env var
    - Mappings are assigned sequential IDs globally
    - All mappings start with human_status = PENDING_REVIEW
    - Suggested modifications are grounded with actual chunk offsets
    - Warnings are returned instead of failing the whole request
    """
    try:
        results = RequirementProcedureMappingService.analyze(db, payload.requirement_ids)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impact analysis failed: {str(e)}")
