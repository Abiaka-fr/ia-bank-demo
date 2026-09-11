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

/** v1.1 — utilisateurs et assignation. */
export const userSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  email: z.string(),
  role: z.string(),
});

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
  uploaded_by_id: z.string().optional(),
  uploaded_at: z.string().optional(),
  assignee_id: z.string().optional(),
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
  /**
   * v1.9 — variantes françaises, quand le backend les fournit (`title_lang_fr`/
   * `requirement_text_lang_fr`, ajoutés par Thư le 2026-09-10, commit `be74658`).
   * Même convention que `Finding.explanation_fr`/`recommended_action_fr` (v1.6) :
   * `normalized_requirement`/`source_text` restent la langue d'origine du corpus,
   * l'écran choisit la variante à afficher selon la langue de l'interface (voir
   * `lib/localized-text.ts`). Absentes en mode mock, où le corpus de démo est déjà
   * rédigé en français.
   */
  normalized_requirement_fr: z.string().optional(),
  source_text_fr: z.string().optional(),
});

export const findingSchema = z.object({
  finding_id: z.string(),
  requirement_id: z.string(),
  // v1.1 : un constat porte UNE procédure (ou aucune), pas une liste.
  procedure_id: z.string().nullable(),
  assessment: assessmentSchema,
  regulatory_evidence: z.array(evidenceRefSchema),
  internal_evidence: z.array(evidenceRefSchema),
  explanation: z.string(),
  missing_or_ambiguous_elements: z.array(z.string()),
  recommended_action: z.string(),
  /**
   * v1.6 — variantes françaises, quand le backend les fournit (`explanation_lang_fr`/
   * `recommended_action_lang_fr`, ajoutés le 2026-09-09). `explanation`/
   * `recommended_action` restent la langue d'origine du corpus (souvent l'anglais en
   * mode backend réel) ; l'écran choisit laquelle afficher selon la langue de
   * l'interface — voir `lib/localized-text.ts`. Absentes en mode mock, où le corpus de
   * démo est déjà rédigé en français.
   */
  explanation_fr: z.string().optional(),
  recommended_action_fr: z.string().optional(),
  /** Action retenue par le relecteur ; vide = `recommended_action` fait foi. */
  custom_action: z.string().optional(),
  priority: prioritySchema,
  confidence_or_evidence_strength: z.number().min(0).max(1).optional(),
  human_status: humanStatusSchema,
  assignee_id: z.string().optional(),
  reviewer_comment: z.string().optional(),
  updated_at: z.string(),
});

export const dashboardSummarySchema = z.object({
  requirements_identified: z.number(),
  procedures_impacted: z.number(),
  potential_gaps: z.number(),
  expert_reviews_required: z.number(),
  actions_pending: z.number(),
  actions_total: z.number(),
  by_human_status: z.array(
    z.object({ human_status: humanStatusSchema, count: z.number() }),
  ),
  by_domain: z.array(z.object({ domain: z.string(), count: z.number() })),
  by_assessment: z.array(
    z.object({ assessment: assessmentSchema, count: z.number() }),
  ),
  top_priority_findings: z.array(findingSchema),
});

/** v1.1 — agrégats d'une régulation, utilisés aussi par les cartes de la liste. */
export const regulationSummarySchema = z.object({
  regulation_id: z.string(),
  title: z.string(),
  status: documentStatusSchema,
  assignee_id: z.string().optional(),
  requirements_identified: z.number(),
  potential_gaps: z.number(),
  expert_reviews_required: z.number(),
  actions_pending: z.number(),
  actions_total: z.number(),
  /** Répartition des constats par décision humaine (progression du traitement). */
  by_human_status: z.array(
    z.object({ human_status: humanStatusSchema, count: z.number() }),
  ),
  /** Assignés par escalade, quand ils diffèrent de `assignee_id`. */
  escalated_assignee_ids: z.array(z.string()),
});

/** v1.2 — arborescence Régulation → Exigence → Procédure (carte mentale). */
export const regulationMapProcedureSchema = z.object({
  finding_id: z.string(),
  procedure_id: z.string().nullable(),
  assessment: assessmentSchema,
  human_status: humanStatusSchema,
});

export const regulationMapRequirementSchema = z.object({
  requirement_id: z.string(),
  source_reference: z.string(),
  normalized_requirement: z.string(),
  procedures: z.array(regulationMapProcedureSchema),
});

export const regulationMapNodeSchema = z.object({
  regulation_id: z.string(),
  title: z.string(),
  status: documentStatusSchema,
  requirements: z.array(regulationMapRequirementSchema),
});

/** v1.1 — agrégats sur toutes les régulations (écran Dashboard d'accueil). */
export const portfolioSummarySchema = z.object({
  regulations_total: z.number(),
  regulations_analyzed: z.number(),
  requirements_identified: z.number(),
  potential_gaps: z.number(),
  expert_reviews_required: z.number(),
  actions_pending: z.number(),
  by_regulation: z.array(regulationSummarySchema),
  by_domain: z.array(z.object({ domain: z.string(), count: z.number() })),
  by_assessment: z.array(
    z.object({ assessment: assessmentSchema, count: z.number() }),
  ),
});

/**
 * v1.7 — Extended European Regulatory Search. `BANK` reproduit exactement le
 * comportement actuel (recherche dans le seul corpus Bank) ; `BANK_PLUS_EU` ajoute une
 * recherche complémentaire dans les sources réglementaires européennes, jamais
 * bloquante si elle échoue (règle explicite de Francis).
 */
export const regulatoryScopeSchema = z.enum(["BANK", "BANK_PLUS_EU"]);

export const analyzeProcedureBodySchema = z.object({
  scope: regulatoryScopeSchema.optional(),
});

/**
 * v1.7/v1.8 — réponse de `POST /api/procedures/:id/analyze`. Les 3 compteurs Europe
 * sont optionnels : absents (ou non fiables) tant qu'aucune recherche européenne
 * réelle n'est branchée — l'écran affiche `AwaitingBackendBadge` à leur place plutôt
 * que d'inventer un chiffre (voir `docs/phases/phase-7-european-search.md` §
 * Convention « en attente backend »). `requirements` (v1.8) évite une requête par
 * exigence pour réutiliser `FindingsActionsTable` tel quel.
 */
export const analyzeProcedureResponseSchema = z.object({
  bank_requirements_identified: z.number(),
  eu_candidate_requirements: z.number().optional(),
  already_in_bank_kb: z.number().optional(),
  additional_eu_candidates: z.number().optional(),
  findings: z.array(findingSchema),
  requirements: z.array(requirementSchema),
});

export const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
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
export type User = z.infer<typeof userSchema>;
export type RegulatoryScope = z.infer<typeof regulatoryScopeSchema>;
export type AnalyzeProcedureBody = z.infer<typeof analyzeProcedureBodySchema>;
export type AnalyzeProcedureResponse = z.infer<typeof analyzeProcedureResponseSchema>;
export type RegulationSummary = z.infer<typeof regulationSummarySchema>;
export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;
export type RegulationMapNode = z.infer<typeof regulationMapNodeSchema>;
export type RegulationMapRequirement = z.infer<
  typeof regulationMapRequirementSchema
>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type CopilotAnswer = z.infer<typeof copilotAnswerSchema>;

/** Body attendu par `POST /api/findings/:id/validate`. */
export const validateFindingBodySchema = z.object({
  human_status: humanStatusSchema,
  custom_action: z.string().optional(),
  reviewer_comment: z.string().optional(),
  /** Renseigné à l'escalade : à qui le constat est confié. */
  assignee_id: z.string().optional(),
  /** v1.3 — qui prend la décision, pour l'historique (`GET /api/regulations/:id/history`). */
  actor_id: z.string(),
});

export type ValidateFindingBody = z.infer<typeof validateFindingBodySchema>;

/**
 * v1.3 — une entrée d'historique : une décision humaine prise sur un constat, à un
 * instant donné, par quelqu'un. Alimente l'onglet « Historique » d'une régulation.
 */
export const auditHistoryEntrySchema = z.object({
  entry_id: z.string(),
  regulation_id: z.string(),
  requirement_id: z.string(),
  finding_id: z.string(),
  procedure_id: z.string().nullable(),
  /** PENDING n'est jamais journalisé : ce n'est pas une décision, c'est l'absence d'une. */
  action: z.enum(["ACCEPTED", "REJECTED", "ESCALATED"]),
  actor_id: z.string(),
  custom_action: z.string().optional(),
  reviewer_comment: z.string().optional(),
  created_at: z.string(),
});

export type AuditHistoryEntry = z.infer<typeof auditHistoryEntrySchema>;

export const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

/** v1.4 — `POST /api/auth/signup`. Réponse : `LoginResponse` (même forme que `login`). */
export const signupBodySchema = z.object({
  email: z.string(),
  password: z.string(),
  full_name: z.string().optional(),
});

export type SignupBody = z.infer<typeof signupBodySchema>;

/**
 * v1.5 — `PUT /api/users/:id/role`. `role` reste une chaîne libre côté backend (pas
 * d'énumération) : le contrat ne lui en impose pas une non plus.
 */
export const updateUserRoleBodySchema = z.object({
  role: z.string(),
});

export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;
