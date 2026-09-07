"""Requirement to procedure mapping model."""

from sqlalchemy import Column, String, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class RequirementProcedureMap(Base):
    """Maps regulatory requirements to internal procedures (gap analysis)."""

    __tablename__ = "requirement_procedure_map"

    mapping_id = Column(String, primary_key=True)
    requirement_id = Column(String, ForeignKey("regulatory_requirements.requirement_id", ondelete="CASCADE"), nullable=False)
    procedure_id = Column(String, ForeignKey("procedures.procedure_id", ondelete="CASCADE"), nullable=False)
    assessment = Column(String)  # COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW
    confidence = Column(Float)  # 0.0 - 1.0
    explanation = Column(Text)
    recommended_action = Column(Text)
    human_status = Column(String)  # PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED
    assignee = Column(String, nullable=True)  # User ID or email, optional

    # Indexes
    __table_args__ = (
        Index("idx_requirement_procedure_map_requirement_id", "requirement_id"),
        Index("idx_requirement_procedure_map_procedure_id", "procedure_id"),
    )

    # Relationships
    requirement = relationship("RegulatoryRequirement", back_populates="mappings")
    procedure = relationship("Procedure", back_populates="mappings")
