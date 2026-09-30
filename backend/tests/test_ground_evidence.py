"""LLM evidence is snapped back to the exact chunk text so the frontend can highlight it."""

import app.db.base  # noqa: F401  (loads models in order, avoids a circular import)
from app.services.requirement_extraction import ground_evidence

CHUNK = (
    "Article 7\n\nMember States shall require self-regulatory bodies to report annually.\n"
    "They shall act with honesty and integrity at all times. Other unrelated text follows here."
)


def test_verbatim_evidence_is_unchanged():
    ev = "Member States shall require self-regulatory bodies to report annually."
    assert ground_evidence(ev, CHUNK) == ev


def test_altered_evidence_is_snapped_to_chunk_text():
    # Non-breaking hyphen, dropped words, "..." — as seen in real LLM output.
    ev = "Member States shall require self‑regulatory bodies to report ... They shall act with honesty and integrity at all times."
    assert ground_evidence(ev, CHUNK) == (
        "Member States shall require self-regulatory bodies to report annually.\n"
        "They shall act with honesty and integrity at all times."
    )


def test_unrelated_evidence_is_kept():
    ev = "Completely different sentence that the document never contains anywhere."
    assert ground_evidence(ev, CHUNK) == ev
