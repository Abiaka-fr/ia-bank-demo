"""Procedures endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentRead
from app.schemas.mapping import ProcedureRead
from app.schemas.procedure import IngestProcedureRequest, IngestProcedureResponse
from app.services.procedure_ingestion import ProcedureIngestionService

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
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProcedureListResponse:
    """
    Get all procedures with optional filtering.

    **Query Parameters:**
    - `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/procedures`
    - `/api/procedures?domain=AML/CFT&limit=100`
    - `/api/procedures?domain=KYC&limit=50`
    """
    query = db.query(Document).filter(Document.document_type == "PROCEDURE")

    if domain:
        query = query.filter(Document.domain == domain)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    items_with_docs = []
    for doc in items:
        doc_read = DocumentRead.model_validate(doc)
        proc_data = {
            "procedure_id": doc.document_id,
            "name": doc.title,
            "domain": doc.domain,
            "owner": doc.assignee,
            "status": None,
            "current_version": doc.current_version,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
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
    doc = db.query(Document).filter(
        Document.document_id == procedure_id,
        Document.document_type == "PROCEDURE"
    ).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Procedure not found")

    return ProcedureRead(
        procedure_id=doc.document_id,
        document_id=doc.document_id,
        name=doc.title,
        domain=doc.domain,
        owner=doc.assignee,
        status=None,
        current_version=doc.current_version,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/ingest", response_model=IngestProcedureResponse, status_code=201)
def ingest_procedure(
    payload: IngestProcedureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IngestProcedureResponse:
    """
    Ingest an internal procedure document: chunk by token count and store.

    This endpoint accepts raw procedure text and:
    1. Uses token-based chunking (max 800 tokens per chunk)
    2. Respects paragraph boundaries - text in one chunk stays within the same paragraph
    3. Uses provided metadata (title, domain, language, summary)
    4. Creates linked Document → DocumentVersion → DocumentChunk → Procedure → ProcedureVersion rows

    **Request Body:**
    - `text` (required): Raw procedure document text
    - `title` (required): Procedure title
    - `domain` (required): Compliance domain (e.g., AML/CFT, KYC, DORA)
    - `language` (required): Document language (EN, FR)
    - `summary` (optional): Brief summary of the procedure
    - `created_by` (required): User/system performing the ingestion
    - `published_at` (optional): Publication date (ISO 8601 format)

    **Response:** IngestProcedureResponse with procedure details and chunk count

    **Notes:**
    - Uses token-based chunking (max 800 tokens per chunk)
    - Paragraph boundaries are preserved
    - No LLM required
    - Procedures are assigned sequential IDs
    - Each procedure starts at version 1.0
    - Category: INTERNAL, Origin: European Union (EU)
    """
    try:
        result = ProcedureIngestionService.ingest(
            db,
            text=payload.text,
            title=payload.title,
            domain=payload.domain,
            language=payload.language,
            created_by=payload.created_by,
            summary=payload.summary,
            published_at=payload.published_at,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Procedure ingestion failed: {str(e)}")
