"""POST /api/copilot/ask with the LLM stubbed (in-memory SQLite, no network)."""

import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.requirement import RegulatoryRequirement
from app.routers import copilot
from app.schemas.copilot import CopilotAskRequest, CopilotLLMResponse


def test_ask_keeps_only_real_citations_and_forwards_history(monkeypatch):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add_all(
        [
            Document(document_id="EXT-T-001", title="EBA guidelines", document_type="REGULATORY_STANDARD"),
            RegulatoryRequirement(requirement_id="REQ-T-1", source_document_id="EXT-T-001",
                                  source_reference="Art. 4", language="EN", evidence="Banks shall verify."),
            Document(document_id="INT-T-001", title="KYC procedure", document_type="PROCEDURE"),
            DocumentVersion(version_id="V1", document_id="INT-T-001", status="ACTIVE"),
            DocumentChunk(chunk_id="C1", document_id="INT-T-001", version_id="V1", chunk_no=1,
                          section_title="Revue", content="Revue annuelle.", language="FR"),
        ]
    )
    db.commit()

    calls = []

    def fake_call(messages, schema, **kwargs):
        calls.append((messages, kwargs))
        return CopilotLLMResponse(answer="ok", citations=["REQ-T-1", "C1", "REQ-INVENTED", "C1"])

    monkeypatch.setattr(copilot.settings, "chat_bot_key", "test-key")
    monkeypatch.setattr(copilot.LLMClient, "call", fake_call)

    body = CopilotAskRequest(question="Et celle-ci ?", history=[{"question": "Q1", "answer": "A1"}])
    result = copilot.ask_copilot(body, None, db)

    assert [(e.document_id, e.section_reference, e.language) for e in result.evidence] == [
        ("EXT-T-001", "Art. 4", "EN"),
        ("INT-T-001", "Revue", "FR"),
    ]
    messages, kwargs = calls[0]
    assert kwargs["reasoning"] is False and kwargs["api_key"] == "test-key"
    assert [m["role"] for m in messages] == ["system", "user", "assistant", "user"]
    assert messages[-1]["content"] == "Et celle-ci ?"
    assert json.loads(messages[2]["content"])["answer"] == "A1"
    assert '"requirements_not_yet_analyzed": 1' in messages[0]["content"]
