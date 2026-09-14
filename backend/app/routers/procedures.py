"""Procedures endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.procedure import Procedure
from app.models.user import User
from app.schemas.document import DocumentRead
from app.schemas.mapping import ProcedureRead

router = APIRouter(prefix="/api/procedures", tags=["procedures"])


class ProcedureWithDocumentRead(BaseModel):
    """Procedure data with linked document information."""

    procedure_id: str
    name: str | None = None
    domain: str | None = None
    owner: str | None = None
    status: str | None = None
    current_version: str | float | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    document: DocumentRead

    model_config = {"from_attributes": True}


class ProcedureListResponse(BaseModel):
    """Paginated list of procedures with document details."""

    total: int
    items: list[ProcedureWithDocumentRead]
    limit: int
    offset: int


@router.get("", response_model=ProcedureListResponse)
def list_procedures(
    domain: str | None = Query(None, description="Filter by domain (e.g., AML/CFT, KYC)"),
    status: str | None = Query(None, description="Filter by status (ACTIVE, SUPERSEDED)"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProcedureListResponse:
    """
    Get all procedures with optional filtering.

    **Query Parameters:**
    - `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
    - `status` (optional): Filter by status (ACTIVE, SUPERSEDED)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/procedures`
    - `/api/procedures?domain=AML/CFT&limit=100`
    - `/api/procedures?status=ACTIVE`
    - `/api/procedures?domain=KYC&limit=50`
    """
    query = db.query(Procedure)

    if domain:
        query = query.filter(Procedure.domain == domain)
    if status:
        query = query.filter(Procedure.status == status)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    items_with_docs = []
    for proc in items:
        doc_read = DocumentRead.model_validate(proc.document) if proc.document else None
        proc_data = {
            "procedure_id": proc.procedure_id,
            "name": proc.name,
            "domain": proc.domain,
            "owner": proc.owner,
            "status": proc.status,
            "current_version": proc.current_version,
            "created_at": proc.created_at,
            "updated_at": proc.updated_at,
            "document": doc_read,
        }
        items_with_docs.append(ProcedureWithDocumentRead(**proc_data))

    return ProcedureListResponse(
        total=total,
        items=items_with_docs,
        limit=limit,
        offset=offset,
    )


@router.get("/{procedure_id}", response_model=ProcedureRead)
def get_procedure(
    procedure_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProcedureRead:
    """Get a single procedure by ID."""
    proc = db.get(Procedure, procedure_id)
    if proc is None:
        raise HTTPException(status_code=404, detail="Procedure not found")

    return ProcedureRead.model_validate(proc)
