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
                    f"Modification references non-existent chunk {mod.location.chunk_no} in {procedure_document_id}"
                )
                continue

            # Verify text at the specified offset matches the original_text
            offset_text = chunk.content[mod.location.start_offset:mod.location.end_offset]
            if offset_text != mod.original_text:
                # Try to find the original text in the chunk
                found_start = chunk.content.find(mod.original_text)
                if found_start == -1:
                    warnings.append(
                        f"Original text not found in chunk {mod.location.chunk_no} of {procedure_document_id}: "
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
            logger.info(f"========== ANALYZING REQUIREMENT: {req_id} ==========")

            # Load requirement with detailed logging
            try:
                requirement = db.query(RegulatoryRequirement).filter(
                    RegulatoryRequirement.requirement_id == req_id
                ).first()

                if not requirement:
                    logger.error(f"❌ REQUIREMENT NOT FOUND: {req_id}")
                    responses.append(
                        AnalyzeMappingsResponse(
                            requirement_id=req_id,
                            mappings_created=0,
                            mapping_ids=[],
                            warnings=[f"Requirement {req_id} not found"],
                        )
                    )
                    continue

                logger.info(f"✅ Requirement loaded: {req_id}")
                logger.info(f"   Title: {requirement.title}")
                logger.info(f"   Domain: {requirement.domain}")
                logger.info(f"   Risk Level: {requirement.risk_level}")
            except Exception as e:
                logger.error(f"❌ FAILED TO LOAD REQUIREMENT {req_id}: {str(e)}", exc_info=True)
                responses.append(
                    AnalyzeMappingsResponse(
                        requirement_id=req_id,
                        mappings_created=0,
                        mapping_ids=[],
                        warnings=[f"Failed to load requirement: {str(e)}"],
                    )
                )
                continue

            # Find candidate procedures (same domain, from document table with type PROCEDURE)
            try:
                candidate_procedures = db.query(Document).filter(
                    Document.domain == requirement.domain,
                    Document.document_type == "PROCEDURE",
                ).all()

                logger.info(f"✅ Found {len(candidate_procedures)} procedures in domain '{requirement.domain}'")
                for proc in candidate_procedures:
                    logger.info(f"   - {proc.document_id}: {proc.title}")
            except Exception as e:
                logger.error(f"❌ FAILED TO QUERY PROCEDURES: {str(e)}", exc_info=True)
                responses.append(
                    AnalyzeMappingsResponse(
                        requirement_id=req_id,
                        mappings_created=0,
                        mapping_ids=[],
                        warnings=[f"Failed to query procedures: {str(e)}"],
                    )
                )
                continue

            created_mapping_ids = []
            warnings = []

            # For each candidate procedure
            for procedure in candidate_procedures:
                logger.info(f"\n--- Assessing requirement vs procedure: {procedure.document_id} ---")
                try:
                    # Validate procedure exists in Document table
                    doc_check = db.query(Document).filter(
                        Document.document_id == procedure.document_id
                    ).first()
                    if not doc_check:
                        error_msg = f"FK VALIDATION FAILED: Procedure {procedure.document_id} not found in documents table"
                        logger.error(f"❌ {error_msg}")
                        warnings.append(error_msg)
                        continue

                    logger.info(f"✅ Procedure document validated: {procedure.document_id}")

                    # Load procedure's chunks
                    logger.info("   Loading active version for procedure...")
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
                        warning_msg = f"No active version for procedure {procedure.document_id}"
                        logger.warning(f"⚠️  {warning_msg}")
                        warnings.append(warning_msg)
                        continue

                    logger.info(f"✅ Version found: {proc_version.version_id}")

                    proc_chunks = (
                        db.query(DocumentChunk)
                        .filter(DocumentChunk.version_id == proc_version.version_id)
                        .order_by(DocumentChunk.chunk_no.asc())
                        .all()
                    )

                    if not proc_chunks:
                        warning_msg = f"No chunks found for procedure {procedure.document_id}"
                        logger.warning(f"⚠️  {warning_msg}")
                        warnings.append(warning_msg)
                        continue

                    logger.info(f"✅ Loaded {len(proc_chunks)} chunks")

                    # Concatenate procedure content
                    proc_content = "\n\n".join(
                        [f"[CHUNK {c.chunk_no}: {c.section_title}]\n{c.content}" for c in proc_chunks]
                    )

                    # LLM call to assess impact
                    logger.info("📞 Calling LLM to assess impact...")
                    logger.debug(f"   Requirement: {requirement.title}")
                    logger.debug(f"   Procedure: {procedure.title}")
                    logger.debug(f"   Content length: {len(proc_content)} chars")

                    try:
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
                        logger.info("✅ LLM response received")
                        logger.info(f"   Assessment: {response.assessment}")
                        logger.info(f"   Confidence: {response.confidence}")
                        logger.info(f"   Suggested modifications: {len(response.suggested_modifications) if response.suggested_modifications else 0}")
                    except Exception as llm_error:
                        error_msg = f"LLM CALL FAILED: {str(llm_error)}"
                        logger.error(f"❌ {error_msg}", exc_info=True)
                        warnings.append(error_msg)
                        continue

                    # Ground suggested modifications (fix offsets)
                    try:
                        logger.info("   Processing suggested modifications...")
                        grounded_mods, ground_warnings = (
                            RequirementProcedureMappingService.ground_suggested_modifications(
                                db, response.suggested_modifications, procedure.document_id
                            )
                        )
                        warnings.extend(ground_warnings)
                        if ground_warnings:
                            for gw in ground_warnings:
                                logger.warning(f"   ⚠️  {gw}")
                        logger.info(f"✅ Grounded {len(grounded_mods)} modifications")
                    except Exception as mod_error:
                        error_msg = f"MODIFICATION GROUNDING FAILED: {str(mod_error)}"
                        logger.error(f"❌ {error_msg}", exc_info=True)
                        warnings.append(error_msg)
                        continue

                    # Serialize modifications to JSON
                    try:
                        logger.info("   Serializing modifications to JSON...")
                        modifications_dict = [mod.model_dump() for mod in grounded_mods] if grounded_mods else None
                        if modifications_dict:
                            import json
                            json_test = json.dumps(modifications_dict)
                            logger.info(f"✅ JSON serialization successful ({len(json_test)} chars)")
                        else:
                            logger.info("✅ No modifications to serialize")
                    except Exception as json_error:
                        error_msg = f"JSON SERIALIZATION FAILED: {str(json_error)}"
                        logger.error(f"❌ {error_msg}", exc_info=True)
                        warnings.append(error_msg)
                        modifications_dict = None

                    # Create mapping
                    try:
                        logger.info("   Generating mapping ID...")
                        mapping_id = RequirementProcedureMappingService.generate_mapping_id(db)
                        logger.info(f"✅ Generated mapping ID: {mapping_id}")

                        logger.info("   Creating mapping record...")
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
                            human_status="PENDING_REVIEW",
                            suggested_modifications=modifications_dict,
                        )
                        logger.info("✅ Mapping object created")
                        logger.debug(f"   requirement_id: {mapping.requirement_id}")
                        logger.debug(f"   procedure_id: {mapping.procedure_id}")
                        logger.debug(f"   assessment: {mapping.assessment}")

                        logger.info("   Adding to session...")
                        db.add(mapping)
                        logger.info("   Flushing to database...")
                        db.flush()
                        logger.info(f"✅ Mapping flushed: {mapping_id}")
                        created_mapping_ids.append(mapping_id)
                    except Exception as create_error:
                        error_msg = f"MAPPING CREATION FAILED: {str(create_error)}"
                        logger.error(f"❌ {error_msg}", exc_info=True)
                        warnings.append(error_msg)
                        continue

                except Exception as e:
                    error_msg = f"Failed to assess {req_id} vs {procedure.document_id}: {str(e)}"
                    logger.error(f"❌ {error_msg}", exc_info=True)
                    warnings.append(error_msg)
                    continue

            try:
                logger.info("   Committing transaction...")
                db.commit()
                logger.info(f"✅ REQUIREMENT ANALYSIS COMPLETE: {req_id}")
                logger.info(f"   Created {len(created_mapping_ids)} mappings")
                logger.info(f"   Warnings: {len(warnings)}")
            except Exception as commit_error:
                error_msg = f"COMMIT FAILED for requirement {req_id}: {str(commit_error)}"
                logger.error(f"❌ {error_msg}", exc_info=True)
                db.rollback()
                warnings.append(error_msg)

            responses.append(
                AnalyzeMappingsResponse(
                    requirement_id=req_id,
                    mappings_created=len(created_mapping_ids),
                    mapping_ids=created_mapping_ids,
                    warnings=warnings,
                )
            )

        return responses
