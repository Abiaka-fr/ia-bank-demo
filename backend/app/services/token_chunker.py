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

    DEFAULT_MAX_TOKENS = 500
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

        - Split document into paragraphs (separated by blank lines)
        - Each chunk has max `max_tokens` tokens
        - Paragraphs are kept together (not split across chunks)
        - If current_chunk_tokens + new_paragraph_tokens > max_tokens, start a new chunk

        Args:
            text: Raw document text
            language: Document language (EN, FR, etc.)
            domain: Compliance domain (AML/CFT, KYC, etc.)

        Returns:
            List of Chunk objects with chunk_no, section_title, content, token_count
        """
        if not text:
            return []

        # Step 1: Split into paragraphs (separated by blank lines)
        paragraphs = self._split_paragraphs(text)

        # Step 2: Filter out empty paragraphs
        paragraphs = [para.strip() for para in paragraphs if para.strip()]

        if not paragraphs:
            return []

        # Step 3: Allocate paragraphs to chunks
        chunks = []
        current_chunk_content = []
        current_chunk_tokens = 0
        chunk_number = 1

        for para in paragraphs:
            para_tokens = self.token_counter.count(para)

            # If adding this paragraph exceeds max tokens and we have content in current chunk
            if current_chunk_tokens + para_tokens > self.max_tokens and current_chunk_content:
                # Save current chunk
                chunk_text = "\n\n".join(current_chunk_content)
                chunks.append(Chunk(
                    chunk_no=chunk_number,
                    section_title=f"Section {chunk_number}",
                    content=chunk_text,
                    token_count=current_chunk_tokens,
                ))
                chunk_number += 1
                # Start new chunk with this paragraph
                current_chunk_content = [para]
                current_chunk_tokens = para_tokens
            else:
                # Add paragraph to current chunk
                current_chunk_content.append(para)
                current_chunk_tokens += para_tokens

        # Step 4: Save the last chunk
        if current_chunk_content:
            chunk_text = "\n\n".join(current_chunk_content)
            chunks.append(Chunk(
                chunk_no=chunk_number,
                section_title=f"Section {chunk_number}",
                content=chunk_text,
                token_count=current_chunk_tokens,
            ))

        return chunks

    @staticmethod
    def _split_paragraphs(text: str) -> list[str]:
        """
        Split text into paragraphs by blank lines.

        Returns list of paragraphs (may include empty strings).
        """
        # Split by one or more blank lines
        paragraphs = re.split(r'\n\s*\n', text)
        return paragraphs
