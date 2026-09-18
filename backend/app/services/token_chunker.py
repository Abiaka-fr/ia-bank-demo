"""Token-based document chunking service that respects paragraph boundaries."""

import re
from typing import NamedTuple

try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False


class Chunk(NamedTuple):
    """A document chunk with metadata."""
    chunk_no: int
    section_title: str
    content: str
    token_count: int


class TokenCounter:
    """Count tokens using tiktoken or fallback to word-based estimation."""

    def __init__(self):
        """Initialize token counter."""
        self.has_tiktoken = HAS_TIKTOKEN
        if HAS_TIKTOKEN:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        else:
            self.encoding = None

    def count(self, text: str) -> int:
        """
        Count tokens in text.

        Uses tiktoken if available, otherwise estimates based on word count.
        """
        if not text:
            return 0

        if self.has_tiktoken and self.encoding:
            return len(self.encoding.encode(text))
        else:
            # Fallback: rough estimate - 1 token ≈ 4 characters or 1 word on average
            # This is a conservative estimate (tends to over-count)
            word_count = len(text.split())
            char_count = len(text)
            # Use whichever is larger to be safe
            return max(word_count, char_count // 4)


class TokenBasedChunker:
    """Chunk documents by token count while respecting paragraph boundaries."""

    DEFAULT_MAX_TOKENS = 800
    MIN_TOKENS_PER_CHUNK = 50  # Minimum tokens to avoid tiny chunks

    def __init__(self, max_tokens: int = DEFAULT_MAX_TOKENS):
        """
        Initialize chunker.

        Args:
            max_tokens: Maximum tokens per chunk (default 800)
        """
        self.max_tokens = max_tokens
        self.token_counter = TokenCounter()

    def chunk(self, text: str, language: str = "EN", domain: str = "AML/CFT") -> list[Chunk]:
        """
        Split text into chunks respecting paragraph boundaries.

        - Each chunk has max `max_tokens` tokens
        - Text within a paragraph stays together (not split across chunks)
        - Paragraphs are separated by blank lines (one or more)
        - Section titles (headings) are detected and become chunk titles

        Args:
            text: Raw document text
            language: Document language (EN, FR, etc.)
            domain: Compliance domain (AML/CFT, KYC, etc.)

        Returns:
            List of Chunk objects with chunk_no, section_title, content, token_count
        """
        if not text:
            return []

        # Split into paragraphs (separated by blank lines)
        # Keep track of which paragraph might be a heading
        paragraphs = self._split_paragraphs(text)

        chunks = []
        current_chunk_content = []
        current_chunk_tokens = 0
        current_section_title = ""
        chunk_number = 1

        for para in paragraphs:
            para_stripped = para.strip()
            if not para_stripped:
                continue

            para_tokens = self.token_counter.count(para_stripped)

            # Detect if this paragraph is a heading (starts with # or is a single line < 50 chars)
            is_heading = self._is_heading(para_stripped)

            # If this is a heading and we already have content, save current chunk and start new one
            if is_heading and current_chunk_content:
                chunk_text = "\n\n".join(current_chunk_content)
                chunks.append(Chunk(
                    chunk_no=chunk_number,
                    section_title=current_section_title or f"Section {chunk_number}",
                    content=chunk_text,
                    token_count=current_chunk_tokens,
                ))
                chunk_number += 1
                current_chunk_content = []
                current_chunk_tokens = 0
                current_section_title = ""

            # If this is a heading, use it as the section title for the next chunk
            if is_heading:
                # Remove markdown formatting from heading
                current_section_title = self._clean_heading(para_stripped)
                current_chunk_content = [para_stripped]
                current_chunk_tokens = para_tokens
            # If adding this paragraph would exceed max tokens and we have content, save chunk
            elif current_chunk_tokens + para_tokens > self.max_tokens and current_chunk_content:
                chunk_text = "\n\n".join(current_chunk_content)
                chunks.append(Chunk(
                    chunk_no=chunk_number,
                    section_title=current_section_title or f"Section {chunk_number}",
                    content=chunk_text,
                    token_count=current_chunk_tokens,
                ))
                chunk_number += 1
                current_chunk_content = [para_stripped]
                current_chunk_tokens = para_tokens
                # If a heading was set, keep it as title; otherwise keep the old one
                if not is_heading:
                    current_section_title = current_section_title or f"Section {chunk_number}"
            # Otherwise add paragraph to current chunk
            else:
                current_chunk_content.append(para_stripped)
                current_chunk_tokens += para_tokens

        # Don't forget the last chunk
        if current_chunk_content:
            chunk_text = "\n\n".join(current_chunk_content)
            chunks.append(Chunk(
                chunk_no=chunk_number,
                section_title=current_section_title or f"Section {chunk_number}",
                content=chunk_text,
                token_count=current_chunk_tokens,
            ))

        return chunks

    @staticmethod
    def _split_paragraphs(text: str) -> list[str]:
        """
        Split text into paragraphs by blank lines.

        Returns list of paragraphs (may include heading-only paragraphs).
        """
        # Split by one or more blank lines
        paragraphs = re.split(r'\n\s*\n', text)
        return paragraphs

    @staticmethod
    def _is_heading(para: str) -> bool:
        """
        Detect if a paragraph is a heading/section title.

        Heuristics:
        - Starts with one or more # (Markdown heading)
        - Starts with uppercase and is a single line < 100 characters
        - Ends with a colon and is short
        """
        para_stripped = para.strip()

        # Markdown heading
        if para_stripped.startswith("#"):
            return True

        # Short uppercase line (potential section title)
        if len(para_stripped) < 100 and "\n" not in para_stripped:
            # Check if it starts with uppercase (likely a title)
            words = para_stripped.split()
            if words and words[0][0].isupper():
                return True

        # Ends with colon (e.g., "Section 1: Title")
        if para_stripped.endswith(":") and len(para_stripped) < 100:
            return True

        return False

    @staticmethod
    def _clean_heading(heading: str) -> str:
        """Remove Markdown formatting from heading."""
        # Remove leading # and whitespace
        cleaned = re.sub(r'^#+\s*', '', heading)
        # Remove trailing # (if any)
        cleaned = re.sub(r'\s*#+\s*$', '', cleaned)
        # Remove markdown bold/italic
        cleaned = re.sub(r'[*_]+', '', cleaned)
        return cleaned.strip()
