"""Service for extracting regulatory requirements from documents."""

import logging
import re
from difflib import SequenceMatcher

from pydantic import BaseModel

from app.models.document import DocumentChunk
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

MIN_ANCHOR_WORDS = 3  # Shorter word runs ("of the") match anywhere, ignore them as span edges
MAX_SKIPPED_WORDS = 40  # Chunk words the LLM may drop between two quoted runs


def _word_key(word: str) -> str:
    return word.lower().replace("\u2011", "-").replace("\u2010", "-").replace("\u2013", "-")


def ground_evidence(evidence: str | None, chunk_text: str) -> str | None:
    """Snap LLM `evidence` to the exact chunk substring it quotes.

    The LLM is asked for a verbatim quote but still drops words, cuts with "..." or swaps
    hyphens, so the frontend can't find it in the document to highlight it. We align the
    words and return the chunk text from the first to the last matched run instead.
    """
    if not evidence or not evidence.strip():
        return evidence
    ev_words = evidence.split()
    chunk_tokens = list(re.finditer(r"\S+", chunk_text))
    blocks = [
        b
        for b in SequenceMatcher(
            None,
            [_word_key(w) for w in ev_words],
            [_word_key(t.group()) for t in chunk_tokens],
            autojunk=False,
        ).get_matching_blocks()
        if b.size >= MIN_ANCHOR_WORDS
    ]
    if sum(b.size for b in blocks) < len(ev_words) / 2:
        logger.warning(f"Evidence not found in chunk, kept as is: {evidence[:80]!r}")
        return evidence
    # Grow from the longest run; stop at a neighbour that sits far away in the chunk
    # (a repeated phrase elsewhere), or the span would swallow unrelated paragraphs.
    lo = hi = max(range(len(blocks)), key=lambda i: blocks[i].size)
    while lo > 0 and _is_near(blocks[lo - 1], blocks[lo]):
        lo -= 1
    while hi < len(blocks) - 1 and _is_near(blocks[hi], blocks[hi + 1]):
        hi += 1
    first, last = blocks[lo], blocks[hi]
    return chunk_text[chunk_tokens[first.b].start() : chunk_tokens[last.b + last.size - 1].end()]


def _is_near(left, right) -> bool:
    ev_gap = right.a - (left.a + left.size)
    chunk_gap = right.b - (left.b + left.size)
    return chunk_gap <= ev_gap + MAX_SKIPPED_WORDS


class RequirementInput(BaseModel):
    """A requirement extracted by LLM."""

    title: str
    requirement_text: str
    title_lang_fr: str  # French translation
    requirement_text_lang_fr: str  # French translation
    risk_level: str  # LOW, MEDIUM, HIGH
    source_reference: str  # e.g., Article 5, Section 2.1
    domain: str
    evidence: str | None = None  # Supporting evidence for the requirement


class RequirementExtractionService:
    """Service for extracting requirements from documents."""

    @staticmethod
    def _extract_from_chunk(chunk: DocumentChunk) -> tuple[int, list[RequirementInput] | None, str | None]:
        """
        Extract requirements from a single chunk via LLM.

        Returns: (chunk_no, requirements, error_message)
        error_message is None on success, a string on failure.
        """
        try:
            logger.info(f"📞 Extracting from chunk {chunk.chunk_no} ({len(chunk.content)} chars)...")

            class ExtractionResponse(BaseModel):
                """Response from LLM extraction call."""
                requirements: list[RequirementInput]

            response = LLMClient.call(
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "You are a regulatory requirement extraction specialist. Analyze the following "
                            "regulation document chunk and extract ALL regulatory requirements if any.\n\n"
                            "For each requirement provide:\n"
                            "- title: Short title/name of the requirement (in English)\n"
                            "- requirement_text: Full text of what is required (in English)\n"
                            "- title_lang_fr: French translation of the title\n"
                            "- requirement_text_lang_fr: French translation of the requirement text\n"
                            "- risk_level: LOW, MEDIUM, or HIGH based on compliance importance\n"
                            "- source_reference: Reference within this chunk (e.g., 'paragraph 1', 'section 2')\n"
                            "- domain: The regulatory domain (e.g., AML/CFT, KYC, DATA_PROTECTION)\n"
                            "- evidence: Copy the EXACT raw text from this chunk that substantiates the requirement. "
                            "Preserve all original formatting including newlines, spaces, and special characters exactly as they appear.\n\n"
                            "IMPORTANT RULES:\n"
                            "- Each requirement must be DISTINCT. Never output the same or a near-identical item twice.\n"
                            "- If the chunk contains no binding requirements, return {\"requirements\": []}. This is correct and expected.\n"
                            "- Output a single JSON object only. No prose, no markdown fences, no text before or after.\n\n"
                            "Respond with valid JSON matching this structure:\n"
                            "{\n"
                            '  "requirements": [\n'
                            "    {\n"
                            '      "title": "...",\n'
                            '      "requirement_text": "...",\n'
                            '      "title_lang_fr": "...",\n'
                            '      "requirement_text_lang_fr": "...",\n'
                            '      "risk_level": "...",\n'
                            '      "source_reference": "...",\n'
                            '      "domain": "...",\n'
                            '      "evidence": "..."\n'
                            "    }\n"
                            "  ]\n"
                            "}\n\n"
                            f"Chunk {chunk.chunk_no}:\n{chunk.content}"
                        ),
                    }
                ],
                response_schema=ExtractionResponse,
            )

            for req in response.requirements:
                req.evidence = ground_evidence(req.evidence, chunk.content)

            logger.info(f"✅ Chunk {chunk.chunk_no}: extracted {len(response.requirements)} requirements")
            return chunk.chunk_no, response.requirements, None

        except Exception as e:
            error_msg = f"❌ Chunk {chunk.chunk_no} extraction failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return chunk.chunk_no, None, error_msg
