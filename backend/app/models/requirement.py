"""Regulatory requirement models."""

from sqlalchemy import Column, String, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class RegulatoryRequirement(Base):
    """Represents a regulatory requirement extracted from a document."""

    __tablename__ = "regulatory_requirements"

    requirement_id = Column(String, primary_key=True)
    source_document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    title = Column(String)  # English title
    title_lang_fr = Column(String, nullable=True)  # French title
    domain = Column(String)  # e.g., AML/CFT, KYC
    language = Column(String)  # EN, FR
    requirement_text = Column(Text)  # English requirement text
    requirement_text_lang_fr = Column(Text, nullable=True)  # French requirement text
    risk_level = Column(String)  # LOW, MEDIUM, HIGH
    source_reference = Column(String)  # e.g., Article 5, Section 2.1
    status = Column(String)  # ACTIVE, SUPERSEDED, etc.

    # Indexes
    __table_args__ = (
        Index("idx_regulatory_requirements_source_document_id", "source_document_id"),
    )

    # Relationships
    document = relationship("Document", back_populates="requirements")
    mappings = relationship("RequirementProcedureMap", back_populates="requirement", cascade="all, delete-orphan")
