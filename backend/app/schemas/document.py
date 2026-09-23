"""Pydantic schemas for documents."""

from datetime import datetime

from pydantic import BaseModel, field_validator


class DocumentChunkRead(BaseModel):
    """A single chunk/section of a document."""

    chunk_id: str
    document_id: str
    version_id: str
    chunk_no: int | None = None
    section_title: str | None = None
    content: str | None = None
    language: str | None = None
    domain: str | None = None

    class Config:
        from_attributes = True


class DocumentVersionRead(BaseModel):
    """Document version with metadata."""

    version_id: str
    document_id: str
    version_no: str | None = None
    version_timestamp: datetime | None = None
    status: str | None = None
    file_path: str | None = None
    sha256: str | None = None
    created_by: str | None = None
    change_reason: str | None = None

    class Config:
        from_attributes = True


class DocumentContentResponse(BaseModel):
    """Complete document content: version metadata + all chunks."""

    version: DocumentVersionRead
    chunks: list[DocumentChunkRead]
    total_chunks: int


class DocumentRead(BaseModel):
    """Document data returned to the client."""

    document_id: str
    title: str
    category: str | None = None
    document_type: str | None = None
    origin_code: str | None = None
    origin_name: str | None = None
    domain: str | None = None
    language: str | None = None
    summary: str | None = None
    current_version: str | None = None
    current_file_path: str | None = None
    data_classification: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    published_at: datetime | None = None
    assignee: str | None = None

    @field_validator("current_version", mode="before")
    @classmethod
    def convert_version_to_string(cls, v):
        """Convert current_version to string (database may return float)."""
        if v is None:
            return None
        return str(v)

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    total: int
    items: list[DocumentRead]
    limit: int
    offset: int


class DocumentChunkInput(BaseModel):
    """Input for creating/updating a document chunk."""

    chunk_no: int
    section_title: str
    content: str
    language: str
    domain: str


class DocumentUpdateRequest(BaseModel):
    """Request body for updating document content and creating new version.

    SHA256 is calculated automatically from chunk content by the backend.
    User provides only the content and metadata.
    """

    change_reason: str
    created_by: str
    file_path: str | None = None
    chunks: list[DocumentChunkInput]

    class Config:
        json_schema_extra = {
            "example": {
                "change_reason": "Updated KYC procedures for new regulation",
                "created_by": "compliance.officer@bank.com",
                "file_path": "documents/internal/INT-PROC-KYC__v2_0__EN.md",
                "chunks": [
                    {
                        "chunk_no": 1,
                        "section_title": "Document Header",
                        "content": "# KYC Procedure v2.0\n\n...",
                        "language": "EN",
                        "domain": "KYC"
                    },
                    {
                        "chunk_no": 2,
                        "section_title": "Customer Risk Assessment",
                        "content": "## Risk Assessment Process\n\n...",
                        "language": "EN",
                        "domain": "KYC"
                    }
                ]
            }
        }


class DocumentVersionResponse(BaseModel):
    """Response after updating document."""

    version_id: str
    document_id: str
    version_no: str
    status: str
    created_by: str
    change_reason: str
    total_chunks: int
    chunks: list[DocumentChunkRead]

    class Config:
        from_attributes = True


class AssigneeUpdate(BaseModel):
    """Update assignee of a document."""

    assignee: str | None = None

    class Config:
        json_schema_extra = {
            "example": {"assignee": "compliance.officer@bank.com"}
        }


class AssigneeHistoryRead(BaseModel):
    """One assignee change on a document (`audit_history`, event_type ASSIGNEE_CHANGED)."""

    audit_id: str
    document_id: str
    from_assignee: str | None = None
    to_assignee: str | None = None
    actor: str | None = None
    event_timestamp: datetime | None = None


class IngestDocumentRequest(BaseModel):
    """Request to ingest and chunk a regulation document.

    Uses token-based chunking (max 800 tokens per chunk).
    Metadata must be provided by the client (no LLM extraction).
    """

    text: str
    title: str
    domain: str  # e.g., AML/CFT, KYC, DORA, MIFID, etc.
    language: str  # EN, FR
    summary: str | None = None
    created_by: str
    published_at: datetime | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "text": "# Regulation Title\n\nSection 1...\n\nSection 2...",
                "title": "EU AML/CFT Regulation",
                "domain": "AML/CFT",
                "language": "EN",
                "summary": "Guidelines on customer due diligence and AML/CFT compliance",
                "created_by": "compliance.officer@bank.com",
                "published_at": "2026-09-16T10:00:00"
            }
        }


class DocumentDeleteResponse(BaseModel):
    """Response after deleting a document."""

    document_id: str
    message: str
    deleted_counts: dict
    """Counts of deleted records: versions, chunks, requirements, mappings."""

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "EXT-EU-AML-001",
                "message": "Document and all linked data deleted successfully",
                "deleted_counts": {
                    "document_versions": 3,
                    "document_chunks": 15,
                    "requirements": 5,
                    "requirement_mappings": 12
                }
            }
        }
