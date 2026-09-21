"""Document endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.user import User
from app.schemas.document import (
    AssigneeUpdate,
    DocumentChunkRead,
    DocumentContentResponse,
    DocumentListResponse,
    DocumentRead,
    DocumentUpdateRequest,
    DocumentVersionRead,
    DocumentVersionResponse,
    IngestDocumentRequest,
)
from app.services.document_ingestion import DocumentIngestionService
from app.services.document_versioning import create_document_version

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


@router.post("/{document_id}/update", response_model=DocumentVersionResponse, status_code=201)
def update_document_content(
    document_id: str,
    payload: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentVersionResponse:
    """
    Update document content, create a new version, and increment version number.

    **Path Parameters:**
    - `document_id`: The ID of the document to update

    **Request Body:**
    - `change_reason` (required): Reason for the update
    - `created_by` (required): User/system that made the update
    - `file_path` (optional): Path to the updated document file
    - `sha256` (optional): SHA256 hash of the file for integrity verification
    - `chunks` (required): Array of document chunks with updated content

    **Chunk Structure:**
    Each chunk must have: chunk_no, section_title, content, language, domain

    **Response:**
    Returns the newly created version with all chunks (HTTP 201)

    **Notes:**
    - A new version_id is generated automatically (VER-{doc_id}-{major version on 2 digits}, e.g. VER-X-02)
    - version_no is auto-incremented (e.g., 1.0 → 2.0)
    - Previous versions are marked as SUPERSEDED
    - Document.current_version is updated to point to new version
    - New chunk_ids are generated for all chunks (CHK-{doc_id}-{version_no}-{chunk_no})
    """
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if not payload.chunks or len(payload.chunks) == 0:
        raise HTTPException(status_code=400, detail="At least one chunk is required")

    # Validate chunks have sequential chunk_no starting from 1
    chunk_nos = sorted([c.chunk_no for c in payload.chunks])
    if chunk_nos != list(range(1, len(chunk_nos) + 1)):
        raise HTTPException(status_code=400, detail="Chunks must be numbered sequentially starting from 1")

    new_version, chunks_created = create_document_version(
        db,
        doc,
        payload.chunks,
        created_by=payload.created_by,
        change_reason=payload.change_reason,
        file_path=payload.file_path,
    )

    db.commit()
    db.refresh(new_version)

    return DocumentVersionResponse(
        version_id=new_version.version_id,
        document_id=new_version.document_id,
        version_no=new_version.version_no,
        status=new_version.status,
        created_by=new_version.created_by,
        change_reason=new_version.change_reason,
        total_chunks=len(chunks_created),
        chunks=[DocumentChunkRead.model_validate(c) for c in chunks_created],
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


@router.put("/{document_id}/assignee", response_model=DocumentRead)
def update_document_assignee(
    document_id: str,
    payload: AssigneeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """
    Update the assignee of a document.

    **Path Parameters:**
    - `document_id`: The ID of the document to update (e.g., EXT-EU-AML-001)

    **Request Body:**
    - `assignee` (optional): User ID or email to assign (null to clear assignment)

    **Example URLs:**
    - `PUT /api/documents/EXT-EU-AML-001/assignee`

    **Example Requests:**
    ```json
    {"assignee": "compliance.officer@bank.com"}
    ```
    or to clear:
    ```json
    {"assignee": null}
    ```
    """
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.assignee = payload.assignee
    db.commit()
    db.refresh(doc)

    return DocumentRead.model_validate(doc)


@router.post("/regulation-ingest", status_code=201)
def ingest_regulation(
    payload: IngestDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingest a regulation document: chunk by token count and store.

    This endpoint accepts raw regulation text and:
    1. Uses token-based chunking (max 800 tokens per chunk)
    2. Respects paragraph boundaries - text in one chunk stays within the same paragraph
    3. Uses provided metadata (title, domain, language, summary)
    4. Stores as Document → DocumentVersion → DocumentChunk rows

    **Request Body:**
    - `text` (required): Raw regulation document text
    - `title` (required): Document title
    - `domain` (required): Compliance domain (e.g., AML/CFT, KYC, DORA)
    - `language` (required): Document language (EN, FR)
    - `summary` (optional): Brief summary of the document
    - `created_by` (required): User/system performing the ingestion
    - `published_at` (optional): Publication date (ISO 8601 format)

    **Response:** IngestDocumentResponse with document details and chunk count

    **Notes:**
    - Uses token-based chunking (max 800 tokens per chunk)
    - Paragraph boundaries are preserved
    - No LLM required
    - Documents are assigned sequential IDs per origin_code
    - Each document starts at version 1.0
    """
    try:
        result = DocumentIngestionService.ingest(
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
        raise HTTPException(status_code=500, detail=f"Document ingestion failed: {str(e)}")
