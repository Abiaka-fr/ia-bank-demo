"""Service for analyzing impact of requirements on procedures."""

import logging
from typing import Optional

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.models.mapping import RequirementProcedureMap
from app.models.requirement import RegulatoryRequirement
from app.schemas.mapping import ModificationLocation, SuggestedModification
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)


class MappingAssessment(BaseModel):
    """Assessment of how a requirement impacts a procedure."""

    assessment: str  # COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW
    confidence: float  # 0.0 - 1.0
    explanation: str
    explanation_lang_fr: str  # French translation of explanation
    recommended_action: str
    recommended_action_lang_fr: str  # French translation of recommended_action
    suggested_modifications: Optional[list[SuggestedModification]] = None


class AnalyzeMappingsResponse(BaseModel):
    """Response from mapping analysis."""

    requirement_id: str
    mappings_created: int
    mapping_ids: list[str]
    warnings: list[str]


class RequirementProcedureMappingService:
    """Service for analyzing how requirements impact procedures."""

    @staticmethod
    def generate_mapping_id(db: Session) -> str:
        """Generate mapping_id using global sequential counter."""
        # Find max numeric suffix across all mappings
        all_maps = db.query(RequirementProcedureMap).all()

        max_seq = 0
        for m in all_maps:
            try:
                suffix = m.mapping_id.split("-")[-1]
                seq = int(suffix)
                max_seq = max(max_seq, seq)
            except (IndexError, ValueError):
                pass

        next_seq = max_seq + 1
        return f"MAP-{next_seq:04d}"

    @staticmethod
    def ground_suggested_modifications(
        db: Session,
        suggested_mods: Optional[list[SuggestedModification]],
        procedure_document_id: str,
    ) -> tuple[list[SuggestedModification], list[str]]:
        """
        Ground suggested modifications with actual chunk/offset info.

        For each modification, find the chunk and verify the offset matches original text.
        If text doesn't match verbatim, try to find the text and update offsets.

        Args:
            db: Database session
            suggested_mods: List of modifications from LLM
            procedure_document_id: Document ID of the procedure being modified

        Returns:
            Tuple of (grounded_modifications, warnings)
        """
        warnings = []
        grounded = []

        print("suggested_mods", suggested_mods)
        if not suggested_mods:
            return [], []

        # Load procedure document's latest version
        active_version = (
            db.query(DocumentVersion)
            .filter(
                DocumentVersion.document_id == procedure_document_id,
                DocumentVersion.status == "ACTIVE",
            )
            .order_by(DocumentVersion.version_timestamp.desc())
            .first()
        )

        if not active_version:
            warnings.append(f"No active version for procedure document {procedure_document_id}")
            return [], warnings

        chunks_by_no = {}
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.version_id == active_version.version_id)
            .all()
        )
        for chunk in chunks:
            chunks_by_no[chunk.chunk_no] = chunk

        # Ground each modification
        for mod in suggested_mods:
            chunk = chunks_by_no.get(mod.location.chunk_no)
            if not chunk:
                warnings.append(
                    f"Modification references non-existent chunk {mod.location.chunk_no} in {procedure_id}"
                )
                continue

            # Verify text at the specified offset matches the original_text
            offset_text = chunk.content[mod.location.start_offset:mod.location.end_offset]
            if offset_text != mod.original_text:
                # Try to find the original text in the chunk
                found_start = chunk.content.find(mod.original_text)
                if found_start == -1:
                    warnings.append(
                        f"Original text not found in chunk {mod.location.chunk_no} of {procedure_id}: "
                        f'"{mod.original_text[:50]}..."'
                    )
                    continue
                # Update offsets to match found text
                found_end = found_start + len(mod.original_text)
                warnings.append(
                    f"Adjusted offsets for modification in chunk {mod.location.chunk_no} "
                    f"(was {mod.location.start_offset}-{mod.location.end_offset}, "
                    f"now {found_start}-{found_end})"
                )
                location = ModificationLocation(
                    chunk_no=mod.location.chunk_no,
                    start_offset=found_start,
                    end_offset=found_end,
                )
            else:
                location = mod.location

            grounded.append(
                SuggestedModification(
                    location=location,
                    original_text=mod.original_text,
                    new_text=mod.new_text,
                )
            )

        return grounded, warnings

    @staticmethod
    def analyze(db: Session, requirement_ids: list[str]) -> list[AnalyzeMappingsResponse]:
        """
        Analyze impact of requirements on procedures.

        For each requirement, find all procedures in the same domain and assess impact.

        Args:
            db: Database session
            requirement_ids: List of requirement IDs to analyze

        Returns:
            List of AnalyzeMappingsResponse, one per requirement
        """
        responses = []

        for req_id in requirement_ids:
            logger.info(f"Analyzing requirement {req_id}...")

            # Load requirement
            requirement = db.query(RegulatoryRequirement).filter(
                RegulatoryRequirement.requirement_id == req_id
            ).first()

            if not requirement:
                logger.warning(f"Requirement {req_id} not found, skipping")
                responses.append(
                    AnalyzeMappingsResponse(
                        requirement_id=req_id,
                        mappings_created=0,
                        mapping_ids=[],
                        warnings=[f"Requirement {req_id} not found"],
                    )
                )
                continue

            # Find candidate procedures (same domain, from document table with type PROCEDURE)
            candidate_procedures = db.query(Document).filter(
                Document.domain == requirement.domain,
                Document.document_type == "PROCEDURE",
            ).all()

            logger.info(
                f"Found {len(candidate_procedures)} procedures in domain {requirement.domain}"
            )

            created_mapping_ids = []
            warnings = []

            # For each candidate procedure
            for procedure in candidate_procedures:
                try:
                    # Load procedure's chunks
                    proc_version = (
                        db.query(DocumentVersion)
                        .filter(
                            DocumentVersion.document_id == procedure.document_id,
                            DocumentVersion.status == "ACTIVE",
                        )
                        .order_by(DocumentVersion.version_timestamp.desc())
                        .first()
                    )

                    if not proc_version:
                        warnings.append(
                            f"No active version for procedure {procedure.document_id}"
                        )
                        continue

                    proc_chunks = (
                        db.query(DocumentChunk)
                        .filter(DocumentChunk.version_id == proc_version.version_id)
                        .order_by(DocumentChunk.chunk_no.asc())
                        .all()
                    )

                    if not proc_chunks:
                        warnings.append(
                            f"No chunks found for procedure {procedure.document_id}"
                        )
                        continue

                    # Concatenate procedure content
                    proc_content = "\n\n".join(
                        [f"[CHUNK {c.chunk_no}: {c.section_title}]\n{c.content}" for c in proc_chunks]
                    )

                    # LLM call to assess impact
                    logger.info(
                        f"Assessing requirement {req_id} vs procedure {procedure.document_id}..."
                    )

                    response = LLMClient.call(
                        messages=[
                            {
                                "role": "user",
                                "content": (
                                    "You are a compliance analyst. Assess how a regulatory requirement "
                                    "impacts an internal procedure.\n\n"
                                    f"REQUIREMENT:\n{requirement.title}\n\n"
                                    f"Details:\n{requirement.requirement_text}\n\n"
                                    f"Domain: {requirement.domain}\n"
                                    f"Risk Level: {requirement.risk_level}\n\n"
                                    f"PROCEDURE:\n{procedure.title}\n\n"
                                    f"Content:\n{proc_content}\n\n"
                                    "Provide your assessment as JSON (all text fields in English and French):\n"
                                    "{\n"
                                    '  "assessment": "COVERED|PARTIALLY_COVERED|POTENTIAL_GAP|HUMAN_REVIEW",\n'
                                    '  "confidence": 0.0-1.0,\n'
                                    '  "explanation": "Why this assessment in English (max 300 chars)",\n'
                                    '  "explanation_lang_fr": "French translation of explanation",\n'
                                    '  "recommended_action": "Recommended action in English (max 500 chars)",\n'
                                    '  "recommended_action_lang_fr": "French translation of recommended_action",\n'
                                    '  "suggested_modifications": [\n'
                                    "    {\n"
                                    '      "location": {\n'
                                    '        "chunk_no": 1,\n'
                                    '        "start_offset": 0,\n'
                                    '        "end_offset": 50\n'
                                    '      },\n'
                                    '      "original_text": "text to replace",\n'
                                    '      "new_text": "replacement text"\n'
                                    "    }\n"
                                    "  ]\n"
                                    "}"
                                ),
                            }
                        ],
                        response_schema=MappingAssessment,
                    )

                    # Ground suggested modifications (fix offsets)
                    grounded_mods, ground_warnings = (
                        RequirementProcedureMappingService.ground_suggested_modifications(
                            db, response.suggested_modifications, procedure.document_id
                        )
                    )
                    warnings.extend(ground_warnings)

                    # Create mapping
                    mapping_id = RequirementProcedureMappingService.generate_mapping_id(db)
                    # Convert SuggestedModification objects to dictionaries for storage
                    modifications_dict = [mod.model_dump() for mod in grounded_mods] if grounded_mods else None
                    mapping = RequirementProcedureMap(
                        mapping_id=mapping_id,
                        requirement_id=req_id,
                        procedure_id=procedure.document_id,
                        assessment=response.assessment,
                        confidence=response.confidence,
                        explanation=response.explanation,
                        explanation_lang_fr=response.explanation_lang_fr,
                        recommended_action=response.recommended_action,
                        recommended_action_lang_fr=response.recommended_action_lang_fr,
                        human_status="PENDING_REVIEW",  # Always PENDING_REVIEW, never from LLM
                        suggested_modifications=modifications_dict,
                    )
                    db.add(mapping)
                    created_mapping_ids.append(mapping_id)

                except Exception as e:
                    error_msg = f"Failed to assess {req_id} vs {procedure.document_id}: {str(e)}"
                    logger.error(error_msg)
                    warnings.append(error_msg)
                    continue

            db.commit()
            logger.info(
                f"✅ Created {len(created_mapping_ids)} mappings for requirement {req_id}"
            )

            responses.append(
                AnalyzeMappingsResponse(
                    requirement_id=req_id,
                    mappings_created=len(created_mapping_ids),
                    mapping_ids=created_mapping_ids,
                    warnings=warnings,
                )
            )

        return responses
