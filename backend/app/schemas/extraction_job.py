"""Schemas for extraction job API endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ExtractionJobRead(BaseModel):
    """Response model for a single extraction job."""

    job_id: UUID
    document_id: str
    document_version_id: str
    chunk_no: int
    status: str  # PENDING, COMPLETED, FAILED
    extracted_requirement_ids: str | None = None  # JSON-encoded list
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateExtractionJobsResponse(BaseModel):
    """Response when creating extraction jobs for a document."""

    document_id: str
    document_version_id: str
    total_jobs_created: int
    jobs: list[ExtractionJobRead]


class ProcessJobResponse(BaseModel):
    """Response from processing a single extraction job."""

    job_id: UUID
    status: str  # COMPLETED or FAILED
    extracted_requirement_ids: list[str] = []
    error_message: str | None = None
    chunks_processed: int = 1
