"""Service for ingesting and chunking regulatory documents."""

import logging
import re
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.services.token_chunker import TokenBasedChunker

logger = logging.getLogger(__name__)


class DocumentMetadata(BaseModel):
    """Document metadata - title and domain inferred by LLM, rest are constants."""

    title: str
    domain: str  # e.g., AML/CFT, KYC
    language: str  # EN, FR
    summary: str | None = None  # Brief summary of the document


class DocumentChunkInput(BaseModel):
    """A chunk as extracted by LLM."""

    chunk_no: int
    section_title: str
    content: str
    language: str
    domain: str


class IngestDocumentResponse(BaseModel):
    """Response from document ingestion."""

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


class DocumentIngestionService:
    """Service for ingesting and chunking regulation documents."""

    @staticmethod
    def generate_document_id(db: Session, origin_code: str, category: str) -> str:
        """Generate document_id using sequential counter per origin_code and category."""
        # Query max existing id for this origin_code+category
        prefix = f"{category[:3].upper()}-{origin_code}"

        # Find max numeric suffix for this prefix
        matching_docs = (
            db.query(Document).filter(Document.document_id.startswith(prefix)).all()
        )

        max_seq = 0
        for doc in matching_docs:
            try:
                # Extract numeric suffix from doc_id (e.g., "EXT-EU-AML-001" -> 1)
                suffix = doc.document_id.split("-")[-1]
                seq = int(suffix)
                max_seq = max(max_seq, seq)
            except (IndexError, ValueError):
                pass

        next_seq = max_seq + 1
        return f"{prefix}-{next_seq:03d}"

    @staticmethod
    def ingest(
        db: Session,
        text: str,
        title: str,
        domain: str,
        language: str,
        created_by: str,
        summary: str | None = None,
        published_at: datetime | None = None,
    ) -> IngestDocumentResponse:
        """
        Ingest a regulation document: chunk by token count, and persist.

        Uses token-based chunking (max 800 tokens per chunk) respecting paragraph boundaries.
        No LLM required - metadata must be provided by client.

        Args:
            db: Database session
            text: Raw regulation text
            title: Document title (provided by client)
            domain: Compliance domain (AML/CFT, KYC, etc.) - provided by client
            language: Document language (EN, FR) - provided by client
            created_by: User/system performing the ingestion
            summary: Optional summary (provided by client)
            published_at: Optional publication date

        Returns:
            IngestDocumentResponse with document and chunk info
        """
        # Step 1: Use provided metadata
        logger.info(f"Step 1: Using provided metadata for document ingestion...")
        logger.info(f"  Title: {title}")
        logger.info(f"  Domain: {domain}")
        logger.info(f"  Language: {language}")

        metadata = DocumentMetadata(
            title=title,
            domain=domain,
            language=language,
            summary=summary or f"Document: {title}",
        )

        # Step 2: Chunk document by token count (max 800 tokens per chunk)
        logger.info("Step 2: Chunking document by token count (max 800 tokens per chunk)...")
        chunker = TokenBasedChunker(max_tokens=800)
        chunks = chunker.chunk(
            text,
            language=metadata.language,
            domain=metadata.domain,
        )

        logger.info(f"Created {len(chunks)} chunks from token-based splitting")

        # Step 3: Generate IDs and persist
        logger.info("Step 3: Generating IDs and persisting to database...")

        # Use constants for fixed metadata
        CATEGORY = "EXTERNAL"
        DOCUMENT_TYPE = "REGULATORY_STANDARD"
        ORIGIN_CODE = "EU"
        ORIGIN_NAME = "European Union"
        DATA_CLASSIFICATION = "EUR-Lex/CELLAR"

        document_id = DocumentIngestionService.generate_document_id(db, ORIGIN_CODE, CATEGORY)
        version_no = "1.0"
        # Extract major version and pad to 2 digits: "1.0" → "01", "2.0" → "02", "10.0" → "10"
        version_major = version_no.split(".")[0]
        version_num_padded = version_major.zfill(2)
        version_id = f"VER-{document_id}-{version_num_padded}"

        # Create Document
        doc = Document(
            document_id=document_id,
            title=metadata.title,
            category=CATEGORY,
            document_type=DOCUMENT_TYPE,
            origin_code=ORIGIN_CODE,
            origin_name=ORIGIN_NAME,
            domain=metadata.domain,
            language=metadata.language,
            summary=metadata.summary,
            data_classification=DATA_CLASSIFICATION,
            current_version=version_no,
            current_file_path=f"documents/{CATEGORY.lower()}/{document_id}__v{version_no.replace('.', '_')}__{metadata.language}.md",
            created_at=datetime.utcnow(),
            published_at=published_at,
            assignee=created_by,
        )
        db.add(doc)
        db.flush()

        # Create DocumentVersion
        doc_version = DocumentVersion(
            version_id=version_id,
            document_id=document_id,
            version_no=version_no,
            version_timestamp=datetime.utcnow(),
            status="ACTIVE",
            file_path=doc.current_file_path,
            created_by=created_by,
            change_reason="Initial document ingestion (token-based chunking, max 800 tokens per chunk)",
        )
        db.add(doc_version)
        db.flush()

        # Create DocumentChunks from token-based chunks
        created_chunks = []
        for chunk in chunks:
            chunk_id = f"CHK-{document_id}-{version_num_padded}-{str(chunk.chunk_no).zfill(3)}"
            doc_chunk = DocumentChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                version_id=version_id,
                chunk_no=chunk.chunk_no,
                section_title=chunk.section_title,
                content=chunk.content,
                language=metadata.language,
                domain=metadata.domain,
            )
            db.add(doc_chunk)
            created_chunks.append(doc_chunk)
            logger.debug(
                f"  Chunk {chunk.chunk_no}: '{chunk.section_title}' "
                f"({chunk.token_count} tokens, {len(chunk.content)} chars)"
            )

        db.commit()
        logger.info(
            f"✅ Document {document_id} ingested: {len(created_chunks)} chunks persisted "
            f"(token-based, max 800 tokens/chunk, respecting paragraph boundaries)"
        )

        return IngestDocumentResponse(
            document_id=document_id,
            title=metadata.title,
            category=CATEGORY,
            document_type=DOCUMENT_TYPE,
            origin_code=ORIGIN_CODE,
            origin_name=ORIGIN_NAME,
            domain=metadata.domain,
            language=metadata.language,
            data_classification=DATA_CLASSIFICATION,
            current_version=version_no,
            chunks_count=len(created_chunks),
        )
