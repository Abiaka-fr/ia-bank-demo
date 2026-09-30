"""Compliance Copilot schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class CopilotTurn(BaseModel):
    question: str = Field(..., max_length=2000)
    answer: str = Field(..., max_length=8000)


class CopilotAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    # Last exchanges, oldest first, so follow-up questions have context.
    history: list[CopilotTurn] = Field(default=[], max_length=4)
    # Interface language: only used when the question's own language is ambiguous.
    locale: Literal["FR", "EN"] = "FR"


class EvidenceRef(BaseModel):
    """Same shape as the frontend `EvidenceRef`: excerpt is verbatim source text."""

    document_id: str
    document_title: str
    section_reference: str
    excerpt: str
    language: str  # FR | EN


class CopilotAnswer(BaseModel):
    answer: str
    evidence: list[EvidenceRef]


class CopilotLLMResponse(BaseModel):
    """What the model returns: evidence is rebuilt server-side from the cited ids."""

    answer: str
    citations: list[str] = []
