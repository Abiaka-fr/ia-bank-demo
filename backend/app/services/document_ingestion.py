"""Service for ingesting and chunking regulatory documents."""

import logging
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.services.llm_client import LLMClient

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
    def ingest(db: Session, text: str, created_by: str, published_at: datetime | None = None) -> IngestDocumentResponse:
        """
        Ingest a regulation document: classify, chunk, and persist.

        Args:
            db: Database session
            text: Raw regulation text

        Returns:
            IngestDocumentResponse with document and chunk info
        """
        # Step 1: LLM call to classify and chunk
        logger.info("Step 1: Calling LLM to classify and chunk document...")

        class ChunkingResponse(BaseModel):
            """Response from LLM chunking call."""

            metadata: DocumentMetadata
            chunks: list[DocumentChunkInput]

        response = LLMClient.call(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "You are a regulatory document processor. Analyze the following EU regulation "
                        "text and:\n\n"
                        "1. Extract metadata: title, domain (e.g. AML/CFT, KYC), language (EN or FR), "
                        "and a brief summary (2-3 sentences).\n\n"
                        "2. Split the text into logical sections/chapters. For each chunk provide: "
                        "chunk_no (sequential starting at 1), section_title, content (the full text "
                        "of that section), language, domain.\n\n"
                        "Respond with valid JSON matching this structure:\n"
                        "{\n"
                        '  "metadata": {\n'
                        '    "title": "...",\n'
                        '    "domain": "...",\n'
                        '    "language": "...",\n'
                        '    "summary": "..."\n'
                        "  },\n"
                        '  "chunks": [\n'
                        "    {\n"
                        '      "chunk_no": 1,\n'
                        '      "section_title": "...",\n'
                        '      "content": "...",\n'
                        '      "language": "...",\n'
                        '      "domain": "..."\n'
                        "    }\n"
                        "  ]\n"
                        "}\n\n"
                        f"Text to process:\n\n{text}"
                    ),
                }
            ],
            response_schema=ChunkingResponse,
        )

        metadata = response.metadata
        chunks_input = response.chunks

        logger.info(f"Classified as: {metadata.title} ({metadata.domain})")
        logger.info(f"Extracted {len(chunks_input)} chunks")

        # Step 2: Generate IDs and persist
        logger.info("Step 2: Generating IDs and persisting to database...")

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
            change_reason="Initial document ingestion",
        )
        db.add(doc_version)
        db.flush()

        # Create DocumentChunks
        created_chunks = []
        for chunk_input in chunks_input:
            chunk_id = f"CHK-{document_id}-{version_num_padded}-{str(chunk_input.chunk_no).zfill(3)}"
            chunk = DocumentChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                version_id=version_id,
                chunk_no=chunk_input.chunk_no,
                section_title=chunk_input.section_title,
                content=chunk_input.content,
                language=chunk_input.language,
                domain=chunk_input.domain,
            )
            db.add(chunk)
            created_chunks.append(chunk)

        db.commit()
        logger.info(
            f"✅ Document {document_id} ingested: {len(created_chunks)} chunks persisted"
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
