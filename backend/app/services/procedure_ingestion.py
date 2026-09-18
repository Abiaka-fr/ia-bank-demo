"""Service for ingesting and chunking internal procedure documents."""

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.schemas.procedure import IngestProcedureResponse
from app.services.token_chunker import TokenBasedChunker

logger = logging.getLogger(__name__)


class ProcedureIngestionService:
    """Service for ingesting and chunking internal procedure documents."""

    @staticmethod
    def generate_document_id(db: Session, origin_code: str, category: str) -> str:
        """Generate document_id using sequential counter per origin_code and category."""
        prefix = f"{category[:3].upper()}-{origin_code}"

        # Find max numeric suffix for this prefix
        matching_docs = (
            db.query(Document).filter(Document.document_id.startswith(prefix)).all()
        )

        max_seq = 0
        for doc in matching_docs:
            try:
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
    ) -> IngestProcedureResponse:
        """
        Ingest an internal procedure document: chunk by token count, and persist.

        Uses token-based chunking (max 800 tokens per chunk) respecting paragraph boundaries.
        No LLM required - metadata must be provided by client.

        Args:
            db: Database session
            text: Raw procedure text
            title: Procedure title (provided by client)
            domain: Compliance domain (AML/CFT, KYC, etc.) - provided by client
            language: Document language (EN, FR) - provided by client
            created_by: User/system performing the ingestion
            summary: Optional summary (provided by client)
            published_at: Optional publication date

        Returns:
            IngestProcedureResponse with procedure and chunk info
        """
        # Step 1: Use provided metadata
        logger.info("Step 1: Using provided metadata for procedure ingestion...")
        logger.info(f"  Title: {title}")
        logger.info(f"  Domain: {domain}")
        logger.info(f"  Language: {language}")

        # Step 2: Chunk document by token count (max 800 tokens per chunk)
        logger.info("Step 2: Chunking procedure by token count (max 800 tokens per chunk)...")
        chunker = TokenBasedChunker(max_tokens=800)
        chunks = chunker.chunk(
            text,
            language=language,
            domain=domain,
        )

        logger.info(f"Created {len(chunks)} chunks from token-based splitting")

        # Step 3: Generate IDs and persist
        logger.info("Step 3: Generating IDs and persisting to database...")

        # Use constants for fixed metadata
        CATEGORY = "INTERNAL"
        DOCUMENT_TYPE = "PROCEDURE"
        ORIGIN_CODE = "EU"
        ORIGIN_NAME = "European Union"
        DATA_CLASSIFICATION = ""

        document_id = ProcedureIngestionService.generate_document_id(db, ORIGIN_CODE, CATEGORY)
        version_no = "1.0"
        version_major = version_no.split(".")[0]
        version_num_padded = version_major.zfill(2)
        version_id = f"VER-{document_id}-{version_num_padded}"

        # Create Document (parent)
        doc = Document(
            document_id=document_id,
            title=title,
            category=CATEGORY,
            document_type=DOCUMENT_TYPE,
            origin_code=ORIGIN_CODE,
            origin_name=ORIGIN_NAME,
            domain=domain,
            language=language,
            summary=summary or f"Procedure: {title}",
            data_classification=DATA_CLASSIFICATION,
            current_version=version_no,
            current_file_path=f"procedures/{CATEGORY.lower()}/{document_id}__v{version_no.replace('.', '_')}__{language}.md",
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
            change_reason="Initial procedure ingestion",
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
                language=language,
                domain=domain,
            )
            db.add(doc_chunk)
            created_chunks.append(doc_chunk)
            logger.debug(
                f"  Chunk {chunk.chunk_no}: '{chunk.section_title}' "
                f"({chunk.token_count} tokens, {len(chunk.content)} chars)"
            )

        db.commit()
        logger.info(
            f"✅ Procedure document {document_id} ingested: {len(created_chunks)} chunks persisted "
            f"(token-based, max 800 tokens/chunk, respecting paragraph boundaries)"
        )

        return IngestProcedureResponse(
            document_id=document_id,
            title=title,
            category=CATEGORY,
            document_type=DOCUMENT_TYPE,
            origin_code=ORIGIN_CODE,
            origin_name=ORIGIN_NAME,
            domain=domain,
            language=language,
            data_classification=DATA_CLASSIFICATION,
            current_version=version_no,
            chunks_count=len(created_chunks),
        )
