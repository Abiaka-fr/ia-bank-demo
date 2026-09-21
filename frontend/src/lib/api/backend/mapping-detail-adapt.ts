/**
 * Adaptation of the nested mapping-detail response (GET /api/mappings/{id})
 * into page-local types for the finding detail full-page view.
 *
 * Page-local types (not added to src/types/api.ts — that mirrors the frozen contract).
 */
import type { DocumentMeta, Finding, Priority } from "@/types/api";

import type { BackendMappingDetail } from "./schemas";
import {
  adaptAssessment,
  adaptHumanStatus,
  adaptPriorityFromRiskLevel,
} from "./finding-adapt";
import { adaptDocument, adaptDomain, adaptLanguage } from "./adapt";

export type SuggestedModification = {
  chunkNo: number | null | undefined;
  originalText: string;
  newText: string;
};

export type MappingDetail = {
  finding: Finding;
  requirementSummary: {
    title: string;
    domain: string[];
    riskLevel: Priority;
    sourceReference: string;
    language: string;
  };
  regulationDocument: DocumentMeta;
  procedure: {
    procedureId: string;
    documentId: string;
    name: string | null | undefined;
    domain: string[];
    owner: string | null | undefined;
    currentVersion: string;
  };
  suggestedModifications: SuggestedModification[];
};

/**
 * Adapt the raw mapping-detail response into the page-local shape.
 */
export function adaptMappingDetail(raw: BackendMappingDetail): MappingDetail {
  const { mapping, requirement, requirement_source_document: sourceDoc, procedure } = raw;

  // Build the Finding shape
  const finding: Finding = {
    finding_id: mapping.mapping_id,
    requirement_id: mapping.requirement_id,
    procedure_id: mapping.procedure_id,
    assessment: adaptAssessment(mapping.assessment),
    // Regulatory evidence built from requirement.evidence if present
    regulatory_evidence: requirement.evidence?.trim()
      ? [
          {
            document_id: requirement.source_document_id,
            document_title: sourceDoc.title,
            section_reference: requirement.source_reference ?? "",
            excerpt: requirement.evidence,
            language: adaptLanguage(requirement.language),
          },
        ]
      : [],
    internal_evidence: [],
    explanation: mapping.explanation ?? "",
    explanation_fr: mapping.explanation_lang_fr ?? undefined,
    missing_or_ambiguous_elements: [],
    recommended_action: mapping.recommended_action ?? "",
    recommended_action_fr: mapping.recommended_action_lang_fr ?? undefined,
    priority: adaptPriorityFromRiskLevel(requirement.risk_level),
    confidence_or_evidence_strength: mapping.confidence ?? undefined,
    human_status: adaptHumanStatus(mapping.human_status),
    assignee_id: mapping.assignee ?? undefined,
    updated_at: new Date().toISOString(),
  };

  const requirementSummary = {
    title: requirement.title ?? "",
    domain: adaptDomain(requirement.domain),
    riskLevel: adaptPriorityFromRiskLevel(requirement.risk_level),
    sourceReference: requirement.source_reference ?? "",
    language: adaptLanguage(requirement.language),
  };

  const regulationDocument = adaptDocument(sourceDoc);

  const procedureSummary = {
    procedureId: procedure.procedure_id,
    documentId: procedure.document_id,
    name: procedure.name,
    domain: adaptDomain(procedure.domain),
    owner: procedure.owner,
    currentVersion: String(procedure.current_version ?? ""),
  };

  const suggestedModifications: SuggestedModification[] = (
    mapping.suggested_modifications ?? []
  ).map((mod) => ({
    chunkNo: mod.location?.chunk_no,
    originalText: mod.original_text,
    newText: mod.new_text,
  }));

  return {
    finding,
    requirementSummary,
    regulationDocument,
    procedure: procedureSummary,
    suggestedModifications,
  };
}
