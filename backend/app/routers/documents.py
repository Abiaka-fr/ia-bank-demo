"""Document endpoints."""

import hashlib
from datetime import datetime

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
    DocumentUpdateRequest,
    DocumentVersionRead,
    DocumentVersionResponse,
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
    - A new version_id is generated automatically (VER-{doc_id}-{version_no})
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

    # Calculate SHA256 hash from combined chunk content
    chunk_content = "\n\n".join([c.content for c in payload.chunks])
    sha256_hash = hashlib.sha256(chunk_content.encode("utf-8")).hexdigest()

    # Parse current version and increment
    try:
        current_ver_str = doc.current_version or "0.0"
        major, minor = map(int, current_ver_str.split("."))
        new_version_no = f"{major + 1}.0"
    except (ValueError, AttributeError):
        new_version_no = "2.0"

    # Generate new version_id
    version_num_padded = new_version_no.replace(".", "").zfill(2)
    new_version_id = f"VER-{document_id}-{version_num_padded}"

    # Mark old versions as SUPERSEDED
    old_versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.status == "ACTIVE"
    ).all()
    for old_ver in old_versions:
        old_ver.status = "SUPERSEDED"

    # Create new version with auto-calculated SHA256
    new_version = DocumentVersion(
        version_id=new_version_id,
        document_id=document_id,
        version_no=new_version_no,
        version_timestamp=datetime.utcnow(),
        status="ACTIVE",
        file_path=payload.file_path,
        sha256=sha256_hash,  # Auto-calculated from chunks
        created_by=payload.created_by,
        change_reason=payload.change_reason,
    )
    db.add(new_version)
    db.flush()

    # Create new chunks with auto-generated chunk_ids
    chunks_created = []
    for chunk_input in payload.chunks:
        chunk_id = f"CHK-{document_id}-{version_num_padded}-{str(chunk_input.chunk_no).zfill(3)}"
        new_chunk = DocumentChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            version_id=new_version_id,
            chunk_no=chunk_input.chunk_no,
            section_title=chunk_input.section_title,
            content=chunk_input.content,
            language=chunk_input.language,
            domain=chunk_input.domain,
        )
        db.add(new_chunk)
        chunks_created.append(new_chunk)

    # Update document's current_version and file_path
    doc.current_version = new_version_no
    if payload.file_path:
        doc.current_file_path = payload.file_path

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
