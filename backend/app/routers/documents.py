"""Document endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.user import User
from app.schemas.document import (
    DocumentChunkRead,
    DocumentContentResponse,
    DocumentListResponse,
    DocumentRead,
    DocumentVersionRead,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
def list_documents(
    category: str | None = Query(None, description="Filter by category (EXTERNAL, INTERNAL, CONTROL)"),
    domain: str | None = Query(None, description="Filter by domain (e.g., AML/CFT, KYC)"),
    language: str | None = Query(None, description="Filter by language (EN, FR)"),
    document_type: str | None = Query(None, description="Filter by document type"),
    title: str | None = Query(None, description="Search by title (partial match)"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    """
    Get a list of documents with optional filters.

    **Query Parameters:**
    - `category`: Filter by category (EXTERNAL, INTERNAL, CONTROL)
    - `domain`: Filter by domain (e.g., AML/CFT, KYC)
    - `language`: Filter by language (EN, FR)
    - `document_type`: Filter by document type
    - `title`: Search by title (case-insensitive partial match)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/documents?domain=AML/CFT&language=FR`
    - `/api/documents?category=EXTERNAL&limit=100`
    - `/api/documents?title=KYC`
    """
    query = db.query(Document)

    if category:
        query = query.filter(Document.category == category)
    if domain:
        query = query.filter(Document.domain == domain)
    if language:
        query = query.filter(Document.language == language)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if title:
        query = query.filter(Document.title.ilike(f"%{title}%"))

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return DocumentListResponse(
        total=total,
        items=[DocumentRead.model_validate(doc) for doc in items],
        limit=limit,
        offset=offset,
    )


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """Get a single document by ID."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentRead.model_validate(doc)


@router.get("/content/{version_id}", response_model=DocumentContentResponse)
def get_document_content(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentContentResponse:
    """
    Get all document content (chunks) by document version ID.

    Returns the version metadata plus all chunks sorted by chunk number.

    **Path Parameters:**
    - `version_id`: The ID of the document version (e.g., VER-12345)

    **Example URL:**
    - `/api/documents/content/EXT-EU-AML-001__v2_0`

    **Response contains:**
    - `version`: Document version metadata
    - `chunks`: Array of all content chunks, sorted by chunk_no
    - `total_chunks`: Total number of chunks in this version
    """
    version = db.get(DocumentVersion, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.version_id == version_id)
        .order_by(DocumentChunk.chunk_no.asc())
        .all()
    )

    return DocumentContentResponse(
        version=DocumentVersionRead.model_validate(version),
        chunks=[DocumentChunkRead.model_validate(chunk) for chunk in chunks],
        total_chunks=len(chunks),
    )
