"""Extraction job model for async requirement extraction."""

import uuid
from datetime import datetime

from sqlalchemy import UUID, Column, DateTime, ForeignKey, Index, Integer, String, Text

from app.db.base import Base


class ExtractionJob(Base):
    """Tracks async extraction jobs for document chunks."""

    __tablename__ = "extraction_jobs"

    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    document_version_id = Column(String, ForeignKey("document_versions.version_id", ondelete="CASCADE"), nullable=False)
    chunk_no = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="PENDING")  # PENDING, COMPLETED, FAILED
    extracted_requirement_ids = Column(Text, nullable=True)  # JSON-encoded list of requirement IDs
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_extraction_jobs_document_id", "document_id"),
        Index("idx_extraction_jobs_document_version_id", "document_version_id"),
        Index("idx_extraction_jobs_status", "status"),
    )
