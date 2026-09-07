"""Pydantic schemas for documents."""

from datetime import datetime

from pydantic import BaseModel


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
    current_version: str | None = None
    current_file_path: str | None = None
    data_classification: str | None = None
    created_at: datetime

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
