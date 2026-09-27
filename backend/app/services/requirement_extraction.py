"""Service for extracting regulatory requirements from documents."""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.requirement import RegulatoryRequirement
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

MAX_WORKERS = 5  # Bound concurrent LLM calls to avoid rate limits


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


class ExtractRequirementsResponse(BaseModel):
    """Response from requirement extraction."""

    document_id: str
    requirements_count: int
    requirement_ids: list[str]
    warnings: list[str] = []


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
                            "regulation document chunk and extract ALL regulatory requirements.\n\n"
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
                            "Respond with valid JSON matching this structure (no markdown):\n"
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

            logger.info(f"✅ Chunk {chunk.chunk_no}: extracted {len(response.requirements)} requirements")
            return chunk.chunk_no, response.requirements, None

        except Exception as e:
            error_msg = f"❌ Chunk {chunk.chunk_no} extraction failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return chunk.chunk_no, None, error_msg

    @staticmethod
    def generate_requirement_id(db: Session) -> str:
        """Generate requirement_id using global sequential counter."""
        # Find max numeric suffix across all requirements
        all_reqs = db.query(RegulatoryRequirement).all()

        max_seq = 0
        for req in all_reqs:
            try:
                suffix = req.requirement_id.split("-")[-1]
                seq = int(suffix)
                max_seq = max(max_seq, seq)
            except (IndexError, ValueError):
                pass

        next_seq = max_seq + 1
        return f"REQ-{next_seq:04d}"

    @staticmethod
    def extract(db: Session, document_id: str) -> ExtractRequirementsResponse:
        """
        Extract requirements from a document using parallel per-chunk LLM calls.

        Args:
            db: Database session
            document_id: ID of document to extract requirements from

        Returns:
            ExtractRequirementsResponse with extracted requirements and warnings

        Raises:
            ValueError: If document not found
        """
        logger.info(f"========== EXTRACTING REQUIREMENTS: {document_id} ==========")

        # Load document and its chunks
        doc = db.query(Document).filter(Document.document_id == document_id).first()
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        logger.info(f"✅ Document loaded: {document_id}")

        # Get latest ACTIVE version
        active_version = (
            db.query(DocumentVersion)
            .filter(
                DocumentVersion.document_id == document_id,
                DocumentVersion.status == "ACTIVE",
            )
            .order_by(DocumentVersion.version_timestamp.desc())
            .first()
        )

        if not active_version:
            raise ValueError(f"No active version found for document {document_id}")

        logger.info(f"✅ Version loaded: {active_version.version_id}")

        # Load chunks
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.version_id == active_version.version_id)
            .order_by(DocumentChunk.chunk_no.asc())
            .all()
        )

        if not chunks:
            raise ValueError(f"No chunks found for document {document_id}")

        logger.info(f"✅ Loaded {len(chunks)} chunks")

        # Step 1: Extract requirements from chunks in parallel
        logger.info(f"Step 1: Extracting requirements from {len(chunks)} chunks in parallel...")

        chunk_results = {}  # chunk_no -> (requirements_list, error_msg)
        warnings = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(RequirementExtractionService._extract_from_chunk, chunk): chunk.chunk_no for chunk in chunks}

            for future in as_completed(futures):
                chunk_no, requirements, error_msg = future.result()
                chunk_results[chunk_no] = (requirements, error_msg)
                if error_msg:
                    warnings.append(error_msg)

        logger.info("✅ Parallel extraction complete")

        # Step 2: Merge results from all chunks (sorted by chunk_no for determinism)
        all_requirements = []
        for chunk_no in sorted(chunk_results.keys()):
            requirements, error_msg = chunk_results[chunk_no]
            if requirements:
                # Augment source_reference with chunk info if needed
                for req in requirements:
                    req.source_reference = f"{req.source_reference}"
                all_requirements.extend(requirements)

        logger.info(f"Step 2: Merged {len(all_requirements)} requirements from all chunks")

        # Step 3: Persist requirements to database
        logger.info("Step 3: Persisting requirements to database...")

        # Get base sequence number once before the loop
        all_existing_reqs = db.query(RegulatoryRequirement).all()
        max_existing_seq = 0
        for req in all_existing_reqs:
            try:
                suffix = req.requirement_id.split("-")[-1]
                seq = int(suffix)
                max_existing_seq = max(max_existing_seq, seq)
            except (IndexError, ValueError):
                pass

        created_req_ids = []
        for idx, req_input in enumerate(all_requirements):
            seq_num = max_existing_seq + idx + 1
            req_id = f"REQ-{seq_num:04d}"
            requirement = RegulatoryRequirement(
                requirement_id=req_id,
                source_document_id=document_id,
                title=req_input.title,
                title_lang_fr=req_input.title_lang_fr,
                domain=req_input.domain,
                language=doc.language,
                requirement_text=req_input.requirement_text,
                requirement_text_lang_fr=req_input.requirement_text_lang_fr,
                risk_level=req_input.risk_level,
                source_reference=req_input.source_reference,
                evidence=req_input.evidence,
                status="ACTIVE",
            )
            db.add(requirement)
            created_req_ids.append(req_id)

        db.commit()
        logger.info(f"✅ EXTRACTION COMPLETE: {document_id}")
        logger.info(f"   Extracted {len(created_req_ids)} requirements")
        if warnings:
            logger.warning(f"   Warnings: {len(warnings)}")
            for w in warnings:
                logger.warning(f"   - {w}")

        return ExtractRequirementsResponse(
            document_id=document_id,
            requirements_count=len(created_req_ids),
            requirement_ids=created_req_ids,
            warnings=warnings,
        )
