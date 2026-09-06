"""Official public regulatory source model."""

from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text

from app.db.base import Base


class OfficialPublicSource(Base):
    """Stores references to official regulatory/public sources."""

    __tablename__ = "official_public_sources"

    source_id = Column(String, primary_key=True)
    authority = Column(String)  # e.g., ACPR, EBA, TRACFIN
    jurisdiction = Column(String)  # e.g., FR, EU, International
    domain = Column(String)  # e.g., AML/CFT, KYC
    title = Column(String)
    document_type = Column(String)  # e.g., REGULATION, GUIDELINE
    language = Column(String)  # EN, FR
    publication_date = Column(DateTime)
    status = Column(String)  # ACTIVE, SUPERSEDED, ARCHIVED
    source_url = Column(String)  # Official source URL
    direct_url = Column(String)  # Direct document URL
    local_status = Column(String)  # e.g., DOWNLOADED, PENDING
    demo_use = Column(String)  # e.g., Y, N
    excerpt = Column(Text)  # Relevant excerpt/summary

    __table_args__ = ()
    # Note: No FK to documents is declared intentionally (no reliable mapping in source data)
