"""Audit history model."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text

from app.db.base import Base
from app.utils.ulid_utils import generate_ulid


class AuditHistory(Base):
    """Records audit events and changes for traceability."""

    __tablename__ = "audit_history"

    audit_id = Column(String(26), primary_key=True, default=generate_ulid)
    document_id = Column(String(26), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    version_id = Column(String(26), ForeignKey("document_versions.version_id", ondelete="SET NULL"), nullable=True)
    event_timestamp = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String)  # e.g., CREATED, UPDATED, ACTIVATED
    actor = Column(String)
    details = Column(Text)

    # Indexes
    __table_args__ = (
        Index("idx_audit_history_document_id", "document_id"),
        Index("idx_audit_history_version_id", "version_id"),
    )

