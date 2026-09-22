"""Requirement to procedure mapping model."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Index, String, Text
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
    explanation = Column(Text)  # English explanation
    recommended_action = Column(Text)  # English recommended action
    explanation_lang_fr = Column(Text, nullable=True)  # French explanation
    recommended_action_lang_fr = Column(Text, nullable=True)  # French recommended action
    human_status = Column(String)  # PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED
    suggested_modifications = Column(JSON, nullable=True)  # Array of suggested text modifications

    # Indexes
    __table_args__ = (
        Index("idx_requirement_procedure_map_requirement_id", "requirement_id"),
        Index("idx_requirement_procedure_map_procedure_id", "procedure_id"),
    )

    # Relationships
    requirement = relationship("RegulatoryRequirement", back_populates="mappings")


class MappingHistory(Base):
    """One row per human decision on a mapping: status change, assignee, applied version."""

    __tablename__ = "mapping_history"

    history_id = Column(String, primary_key=True, default=lambda: f"MHI-{uuid.uuid4().hex}")
    mapping_id = Column(String, nullable=False)
    # Denormalised so "every mapping linked to a requirement" is one indexed query.
    requirement_id = Column(String, nullable=False)
    procedure_id = Column(String)  # procedure document_id, as on the mapping
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    assignee = Column(String)  # ESCALATE: user_id or email escalated to
    new_version_id = Column(String)  # ACCEPT: procedure version created
    comment = Column(Text)  # reviewer's chosen action
    actor = Column(String)  # user_id who decided
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_mapping_history_requirement_id", "requirement_id"),
        Index("idx_mapping_history_mapping_id", "mapping_id"),
    )
