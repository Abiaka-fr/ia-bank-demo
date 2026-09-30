"""POST /api/copilot/ask with the LLM stubbed (in-memory SQLite, no network)."""

import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.mapping import RequirementProcedureMap
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
            RegulatoryRequirement(requirement_id="REQ-T-2", source_document_id="EXT-T-001", domain="KYC",
                                  risk_level="HIGH"),
            RegulatoryRequirement(requirement_id="REQ-T-3", source_document_id="EXT-T-001", domain="KYC",
                                  risk_level="HIGH"),
            RequirementProcedureMap(mapping_id="M1", requirement_id="REQ-T-2", procedure_id="INT-T-001",
                                    assessment="POTENTIAL_GAP", human_status="PENDING_REVIEW",
                                    # Stored as a JSON *string* on Postgres (seen on Neon).
                                    suggested_modifications=json.dumps([{"location": {"chunk_no": 1},
                                                                         "original_text": "annuelle",
                                                                         "new_text": "semestrielle"}])),
            RequirementProcedureMap(mapping_id="M2", requirement_id="REQ-T-3", procedure_id="INT-T-001",
                                    assessment="POTENTIAL_GAP", human_status="ACCEPT"),
        ]
    )
    db.commit()

    calls = []

    def fake_call(messages, schema, **kwargs):
        calls.append((messages, kwargs))
        return CopilotLLMResponse(answer="ok", citations=["REQ-T-1", "C1", "REQ-INVENTED", "C1"])

    monkeypatch.setattr(copilot.settings, "chat_bot_key", "test-key")
    monkeypatch.setattr(copilot.LLMClient, "call", fake_call)

    body = CopilotAskRequest(
        question="Et celle-ci ?", history=[{"question": "Q1", "answer": "A1"}], locale="EN"
    )
    result = copilot.ask_copilot(body, None, db)

    assert [(e.document_id, e.section_reference, e.language) for e in result.evidence] == [
        ("EXT-T-001", "Art. 4", "EN"),
        ("INT-T-001", "Revue", "FR"),
    ]
    messages, kwargs = calls[0]
    assert kwargs["reasoning"] is False and kwargs["api_key"] == "test-key"
    assert [m["role"] for m in messages] == ["system", "user", "assistant", "system", "user"]
    assert messages[-1]["content"] == "Et celle-ci ?"
    assert json.loads(messages[2]["content"])["answer"] == "A1"
    data = json.loads(messages[0]["content"].split("DATA:\n", 1)[1])
    stats = data["stats"]
    assert stats["requirements"]["analyzed"] == 2 and stats["requirements"]["not_yet_analyzed"] == 1
    assert stats["requirements"]["by_domain"] == {"KYC": 2, "null": 1}
    # Remaining = REQ-T-1 (not analyzed) + REQ-T-2 (pending); REQ-T-3 is accepted, so out.
    assert stats["requirements"]["remaining"] == {"total": 2, "by_risk_level": {"null": 1, "HIGH": 1}}
    # 2 mappings on the same procedure: the procedure counts once, the mappings twice.
    assert stats["procedures"]["by_assessment"] == {"POTENTIAL_GAP": 1}
    assert stats["mappings"]["by_assessment"] == {"POTENTIAL_GAP": 2}
    assert data["mappings"][0]["suggested_changes"] == [{"original": "annuelle", "proposed": "semestrielle"}]
    assert "reply in English" in messages[-2]["content"]  # UI-language fallback, next to the question
