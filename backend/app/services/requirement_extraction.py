"""Service for extracting regulatory requirements from documents."""

import logging

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.requirement import RegulatoryRequirement
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)


class RequirementInput(BaseModel):
    """A requirement extracted by LLM."""

    title: str
    requirement_text: str
    title_lang_fr: str  # French translation
    requirement_text_lang_fr: str  # French translation
    risk_level: str  # LOW, MEDIUM, HIGH
    source_reference: str  # e.g., Article 5, Section 2.1
    domain: str


class ExtractRequirementsResponse(BaseModel):
    """Response from requirement extraction."""

    document_id: str
    requirements_count: int
    requirement_ids: list[str]


class RequirementExtractionService:
    """Service for extracting requirements from documents."""

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
        Extract requirements from a document.

        Args:
            db: Database session
            document_id: ID of document to extract requirements from

        Returns:
            ExtractRequirementsResponse with extracted requirements

        Raises:
            ValueError: If document not found
        """
        # Load document and its chunks
        logger.info(f"Loading document {document_id}...")

        doc = db.query(Document).filter(Document.document_id == document_id).first()
        if not doc:
            raise ValueError(f"Document {document_id} not found")

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

        # Load chunks
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.version_id == active_version.version_id)
            .order_by(DocumentChunk.chunk_no.asc())
            .all()
        )

        if not chunks:
            raise ValueError(f"No chunks found for document {document_id}")

        # Concatenate chunk content with labels
        content_with_labels = "\n\n".join(
            [f"[CHUNK {c.chunk_no}: {c.section_title}]\n{c.content}" for c in chunks]
        )

        logger.info(f"Step 1: Calling LLM to extract requirements...")

        # LLM call to extract requirements
        class ExtractionResponse(BaseModel):
            """Response from LLM extraction call."""

            requirements: list[RequirementInput]

        response = LLMClient.call(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "You are a regulatory requirement extraction specialist. Analyze the following "
                        "regulation document and extract ALL regulatory requirements.\n\n"
                        "For each requirement provide:\n"
                        "- title: Short title/name of the requirement (in English)\n"
                        "- requirement_text: Full text of what is required (in English)\n"
                        "- title_lang_fr: French translation of the title\n"
                        "- requirement_text_lang_fr: French translation of the requirement text\n"
                        "- risk_level: LOW, MEDIUM, or HIGH based on compliance importance\n"
                        "- source_reference: Where in the document this comes from chunk_no (e.g 1, 2, 3)\n"
                        "- domain: The regulatory domain (e.g., AML/CFT, KYC, DATA_PROTECTION)\n\n"
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
                        '      "domain": "..."\n'
                        "    }\n"
                        "  ]\n"
                        "}\n\n"
                        f"Document:\n\n{content_with_labels}"
                    ),
                }
            ],
            response_schema=ExtractionResponse,
        )
        requirements_input = response.requirements
        logger.info(f"Extracted {len(requirements_input)} requirements")

        # Persist requirements
        logger.info("Step 2: Persisting requirements to database...")

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
        for idx, req_input in enumerate(requirements_input):
            # Generate sequential ID within this batch
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
                status="ACTIVE",
            )
            db.add(requirement)
            created_req_ids.append(req_id)

        db.commit()
        logger.info(f"✅ Extracted {len(created_req_ids)} requirements from {document_id}")

        return ExtractRequirementsResponse(
            document_id=document_id,
            requirements_count=len(created_req_ids),
            requirement_ids=created_req_ids,
        )
