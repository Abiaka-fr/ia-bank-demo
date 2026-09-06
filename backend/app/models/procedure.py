"""Procedure-related models."""

from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Procedure(Base):
    """Represents an internal procedure/policy."""

    __tablename__ = "procedures"

    procedure_id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    name = Column(String)
    domain = Column(String)  # e.g., AML/CFT, KYC
    owner = Column(String)
    status = Column(String)  # ACTIVE, SUPERSEDED, etc.
    current_version = Column(String)

    # Indexes
    __table_args__ = (
        Index("idx_procedures_document_id", "document_id"),
    )

    # Relationships
    document = relationship("Document", back_populates="procedures")
    versions = relationship("ProcedureVersion", back_populates="procedure", cascade="all, delete-orphan")
    mappings = relationship("RequirementProcedureMap", back_populates="procedure", cascade="all, delete-orphan")


class ProcedureVersion(Base):
    """Represents a version of a procedure."""

    __tablename__ = "procedure_versions"

    procedure_version_id = Column(String, primary_key=True)
    procedure_id = Column(String, ForeignKey("procedures.procedure_id", ondelete="CASCADE"), nullable=False)
    version_no = Column(String)
    version_timestamp = Column(DateTime)
    status = Column(String)  # ACTIVE, SUPERSEDED
    document_version_id = Column(String, ForeignKey("document_versions.version_id", ondelete="SET NULL"), nullable=True)

    # Indexes
    __table_args__ = (
        Index("idx_procedure_versions_procedure_id", "procedure_id"),
        Index("idx_procedure_versions_document_version_id", "document_version_id"),
    )

    # Relationships
    procedure = relationship("Procedure", back_populates="versions")
    document_version = relationship("DocumentVersion", back_populates="procedure_versions")
