"""Document-related models."""

from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Document(Base):
    """Represents a regulatory or internal document."""

    __tablename__ = "documents"

    document_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    category = Column(String)  # EXTERNAL, INTERNAL, CONTROL
    document_type = Column(String)  # e.g., REGULATORY_STANDARD, GUIDELINE, POLICY
    origin_code = Column(String)
    origin_name = Column(String)
    domain = Column(String)  # e.g., AML/CFT, KYC
    language = Column(String)  # EN, FR
    current_version = Column(String)
    current_file_path = Column(String)
    data_classification = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    requirements = relationship("RegulatoryRequirement", back_populates="document", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="document", cascade="all, delete-orphan")
    controls = relationship("Control", back_populates="document", cascade="all, delete-orphan")
    audit_history = relationship("AuditHistory", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    """Represents a version of a document."""

    __tablename__ = "document_versions"

    version_id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    version_no = Column(String)
    version_timestamp = Column(DateTime)
    status = Column(String)  # ACTIVE, SUPERSEDED
    file_path = Column(String)
    sha256 = Column(String)
    created_by = Column(String)
    change_reason = Column(String)

    # Indexes
    __table_args__ = (
        Index("idx_document_versions_document_id", "document_id"),
    )

    # Relationships
    document = relationship("Document", back_populates="versions")
    chunks = relationship("DocumentChunk", back_populates="version", cascade="all, delete-orphan")
    procedure_versions = relationship("ProcedureVersion", back_populates="document_version", cascade="all, delete-orphan")
    audit_history = relationship("AuditHistory", back_populates="version", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Represents a chunk/section of a document."""

    __tablename__ = "document_chunks"

    chunk_id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    version_id = Column(String, ForeignKey("document_versions.version_id", ondelete="CASCADE"), nullable=False)
    chunk_no = Column(Integer)
    section_title = Column(String)
    content = Column(Text)
    language = Column(String)
    domain = Column(String)

    # Indexes
    __table_args__ = (
        Index("idx_document_chunks_document_id", "document_id"),
        Index("idx_document_chunks_version_id", "version_id"),
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
    version = relationship("DocumentVersion", back_populates="chunks")
