/**
 * Types partagés Frontend <-> Backend.
 *
 * Source de vérité : `docs/api-contract.md`. Ce fichier doit rester un miroir exact
 * de la section "Types partagés" du contrat — ne jamais y ajouter un champ qui n'y
 * figure pas.
 *
 * Les schémas Zod et les types TypeScript sont définis ensemble (types inférés des
 * schémas) pour qu'il n'existe qu'UNE seule définition par entité : le contrat décrit
 * la forme, Zod la vérifie à l'exécution, TypeScript la propage à la compilation.
 */
import { z } from "zod";

export const languageSchema = z.enum(["FR", "EN"]);

export const assessmentSchema = z.enum([
  "COVERED",
  "PARTIAL",
  "POTENTIAL_GAP",
  "NO_RELEVANT_PROCEDURE",
  "EXPERT_REVIEW",
]);

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const humanStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "ESCALATED",
]);

export const documentTypeSchema = z.enum(["REGULATION", "INTERNAL_PROCEDURE"]);

export const documentStatusSchema = z.enum([
  "NOT_ANALYZED",
  "ANALYZING",
  "ANALYZED",
]);

export const evidenceRefSchema = z.object({
  document_id: z.string(),
  document_title: z.string(),
  section_reference: z.string(),
  /** Texte source exact — n'est JAMAIS traduit (voir frontend/CLAUDE.md § Bilingue). */
  excerpt: z.string(),
  language: languageSchema,
});

export const documentMetaSchema = z.object({
  document_id: z.string(),
  title: z.string(),
  document_type: documentTypeSchema,
  authority_or_owner: z.string(),
  domain: z.array(z.string()),
  language: languageSchema,
  version: z.string(),
  publication_date: z.string().optional(),
  effective_date: z.string().optional(),
  status: documentStatusSchema,
});

export const documentDetailSchema = documentMetaSchema.extend({
  extracted_text: z.string(),
});

export const requirementSchema = z.object({
  requirement_id: z.string(),
  source_document_id: z.string(),
  source_reference: z.string(),
  source_text: z.string(),
  normalized_requirement: z.string(),
  domain: z.array(z.string()),
  impacted_activity: z.array(z.string()),
  effective_date: z.string().optional(),
  language: languageSchema,
});

export const findingSchema = z.object({
  finding_id: z.string(),
  requirement_id: z.string(),
  matched_procedure_ids: z.array(z.string()),
  assessment: assessmentSchema,
  regulatory_evidence: z.array(evidenceRefSchema),
  internal_evidence: z.array(evidenceRefSchema),
  explanation: z.string(),
  missing_or_ambiguous_elements: z.array(z.string()),
  recommended_action: z.string(),
  priority: prioritySchema,
  confidence_or_evidence_strength: z.number().min(0).max(1).optional(),
  human_status: humanStatusSchema,
  reviewer_comment: z.string().optional(),
  updated_at: z.string(),
});

export const dashboardSummarySchema = z.object({
  requirements_identified: z.number(),
  procedures_impacted: z.number(),
  potential_gaps: z.number(),
  expert_reviews_required: z.number(),
  actions_pending: z.number(),
  by_domain: z.array(z.object({ domain: z.string(), count: z.number() })),
  by_assessment: z.array(
    z.object({ assessment: assessmentSchema, count: z.number() }),
  ),
  top_priority_findings: z.array(findingSchema),
});

export const copilotAnswerSchema = z.object({
  answer: z.string(),
  evidence: z.array(evidenceRefSchema),
});

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type Language = z.infer<typeof languageSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type HumanStatus = z.infer<typeof humanStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type DocumentMeta = z.infer<typeof documentMetaSchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type CopilotAnswer = z.infer<typeof copilotAnswerSchema>;

/** Body attendu par `POST /api/findings/:id/validate`. */
export const validateFindingBodySchema = z.object({
  human_status: humanStatusSchema,
  reviewer_comment: z.string().optional(),
});

export type ValidateFindingBody = z.infer<typeof validateFindingBodySchema>;
