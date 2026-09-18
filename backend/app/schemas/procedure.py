"""Pydantic schemas for procedures."""

from datetime import datetime

from pydantic import BaseModel


class IngestProcedureRequest(BaseModel):
    """Request to ingest and chunk an internal procedure document.

    Uses token-based chunking (max 800 tokens per chunk).
    Metadata must be provided by the client (no LLM extraction).
    """

    text: str
    title: str
    domain: str  # e.g., AML/CFT, KYC, DORA, MIFID, etc.
    language: str  # EN, FR
    summary: str | None = None
    created_by: str
    published_at: datetime | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "text": "# Internal Procedure Title\n\n## Procedure Section 1\n\nContent here...\n\n## Procedure Section 2\n\nMore content...",
                "title": "KYC Onboarding Procedure",
                "domain": "KYC",
                "language": "EN",
                "summary": "Internal procedure for customer onboarding and KYC verification",
                "created_by": "compliance.officer@bank.com",
                "published_at": "2026-09-16T10:00:00"
            }
        }


class IngestProcedureResponse(BaseModel):
    """Response from procedure ingestion."""

    document_id: str
    title: str
    category: str
    document_type: str
    origin_code: str
    origin_name: str
    domain: str
    language: str
    data_classification: str
    current_version: str
    chunks_count: int
