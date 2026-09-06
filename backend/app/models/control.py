"""Control model."""

from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Control(Base):
    """Represents a compliance control."""

    __tablename__ = "controls"

    control_id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    name = Column(String)
    domain = Column(String)  # e.g., AML/CFT, KYC
    frequency = Column(String)  # e.g., Daily, Weekly, Monthly
    owner = Column(String)
    status = Column(String)  # ACTIVE, SUPERSEDED, etc.

    # Indexes
    __table_args__ = (
        Index("idx_controls_document_id", "document_id"),
    )

    # Relationships
    document = relationship("Document", back_populates="controls")
