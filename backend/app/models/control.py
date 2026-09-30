"""Control model."""

from sqlalchemy import Column, ForeignKey, Index, String

from app.db.base import Base
from app.utils.ulid_utils import generate_ulid


class Control(Base):
    """Represents a compliance control."""

    __tablename__ = "controls"

    control_id = Column(String(26), primary_key=True, default=generate_ulid)
    document_id = Column(String(26), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    name = Column(String)
    domain = Column(String)  # e.g., AML/CFT, KYC
    frequency = Column(String)  # e.g., Daily, Weekly, Monthly
    owner = Column(String)
    status = Column(String)  # ACTIVE, SUPERSEDED, etc.

    # Indexes
    __table_args__ = (
        Index("idx_controls_document_id", "document_id"),
    )

