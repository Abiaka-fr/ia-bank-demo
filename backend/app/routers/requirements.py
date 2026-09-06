"""Regulatory requirements endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.requirement import RegulatoryRequirement
from app.models.user import User
from app.schemas.requirement import RegulatoryRequirementRead, RequirementsListResponse

router = APIRouter(prefix="/api/requirements", tags=["requirements"])


@router.get("/by-documents", response_model=RequirementsListResponse)
def list_requirements_by_documents(
    document_ids: list[str] = Query(..., description="List of source document IDs to filter by"),
    domain: str | None = Query(None, description="Filter by domain (e.g., AML/CFT, KYC)"),
    risk_level: str | None = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH)"),
    language: str | None = Query(None, description="Filter by language (EN, FR)"),
    status: str | None = Query(None, description="Filter by status (ACTIVE, SUPERSEDED)"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsListResponse:
    """
    Get regulatory requirements linked to a list of source document IDs.

    **Query Parameters:**
    - `document_ids` (required, list): List of source document IDs to filter by
      Example: `?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002`
    - `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
    - `risk_level` (optional): Filter by risk level (LOW, MEDIUM, HIGH)
    - `language` (optional): Filter by language (EN, FR)
    - `status` (optional): Filter by status (ACTIVE, SUPERSEDED)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/requirements/by-documents?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002`
    - `/api/requirements/by-documents?document_ids=EXT-EU-AML-001&risk_level=HIGH&limit=100`
    - `/api/requirements/by-documents?document_ids=EXT-ACPR-LCBFT-003&language=FR`
    """
    if not document_ids or len(document_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one document_id is required")

    query = db.query(RegulatoryRequirement).filter(
        RegulatoryRequirement.source_document_id.in_(document_ids)
    )

    if domain:
        query = query.filter(RegulatoryRequirement.domain == domain)
    if risk_level:
        query = query.filter(RegulatoryRequirement.risk_level == risk_level)
    if language:
        query = query.filter(RegulatoryRequirement.language == language)
    if status:
        query = query.filter(RegulatoryRequirement.status == status)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return RequirementsListResponse(
        total=total,
        items=[RegulatoryRequirementRead.model_validate(req) for req in items],
        limit=limit,
        offset=offset,
        document_ids_queried=document_ids,
    )


@router.get("/{requirement_id}", response_model=RegulatoryRequirementRead)
def get_requirement(
    requirement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RegulatoryRequirementRead:
    """Get a single regulatory requirement by ID."""
    req = db.get(RegulatoryRequirement, requirement_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    return RegulatoryRequirementRead.model_validate(req)
