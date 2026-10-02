/**
 * Traduction couples exigence × procédure (backend, `POST db41421`) -> `Finding` du
 * contrat. Fonctions pures, testées — même principe que `adapt.ts`.
 *
 * Le backend ne relie pas un couple à un passage précis du document interne (pas de
 * `chunk_id` sur `RequirementProcedureMap`) : `regulatory_evidence` cite le texte de
 * l'exigence, `internal_evidence` reste vide — la liste n'affiche que le nom de la
 * procédure (`procedure_title`). Les passages à modifier sont ceux de la page d'un
 * constat (`suggested_modifications`, voir `mapping-detail-adapt.ts`).
 */
import type {
  Assessment,
  EvidenceRef,
  Finding,
  HumanStatus,
  Priority,
  Requirement,
} from "@/types/api";

import type { BackendMapping, BackendProcedureMinimal } from "./schemas";

/**
 * COVERED/PARTIALLY_COVERED/POTENTIAL_GAP/HUMAN_REVIEW (DB) -> les 5 valeurs du
 * contrat. Une valeur absente ou inconnue retombe sur `EXPERT_REVIEW` — jamais sur
 * `COVERED`, pour ne jamais affirmer une couverture qu'on ne peut pas garantir.
 */
export function adaptAssessment(raw: string | null | undefined): Assessment {
  switch (raw) {
    case "COVERED":
      return "COVERED";
    case "PARTIALLY_COVERED":
      return "PARTIAL";
    case "POTENTIAL_GAP":
      return "POTENTIAL_GAP";
    case "HUMAN_REVIEW":
      return "EXPERT_REVIEW";
    default:
      return "EXPERT_REVIEW";
  }
}

/**
 * La base de référence ne contient que `PENDING_REVIEW` au repos, mais
 * `PUT /api/mappings/:id/human-status` (2026-09-07) stocke le verbe court
 * (`ACCEPT`/`REJECT`/`ESCALATE`) — pas le participe passé documenté par erreur dans le
 * filtre de `GET /api/mappings/all`. Les deux formes sont acceptées ici : sans ça, une
 * exigence tout juste acceptée via `validateMapping` (`resources.ts`) réapparaîtrait
 * en attente au prochain chargement, la valeur stockée ("ACCEPT") ne correspondant à
 * aucun `case` reconnu.
 */
export function adaptHumanStatus(raw: string | null | undefined): HumanStatus {
  switch (raw) {
    case "ACCEPT":
    case "ACCEPTED":
      return "ACCEPTED";
    case "REJECT":
    case "REJECTED":
      return "REJECTED";
    case "ESCALATE":
    case "ESCALATED":
      return "ESCALATED";
    case "PENDING_REVIEW":
    default:
      return "PENDING";
  }
}

/**
 * Sens inverse d'`adaptHumanStatus`, pour le corps de
 * `PUT /api/mappings/:id/human-status` : le contrat parle au participe passé
 * (`ACCEPTED`/`REJECTED`/`ESCALATED`/`PENDING`), le backend attend le verbe court
 * (`ACCEPT`/`REJECT`/`ESCALATE`/`PENDING_REVIEW`, voir `backend/API.md` § 4).
 */
export function adaptHumanStatusToBackend(status: HumanStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "ACCEPT";
    case "REJECTED":
      return "REJECT";
    case "ESCALATED":
      return "ESCALATE";
    case "PENDING":
    default:
      return "PENDING_REVIEW";
  }
}

/**
 * `risk_level` de l'exigence (LOW/MEDIUM/HIGH) partage exactement les valeurs de
 * `Priority` — aucune traduction nécessaire, seulement une valeur de repli.
 */
export function adaptPriorityFromRiskLevel(raw: string | null | undefined): Priority {
  return raw === "LOW" || raw === "MEDIUM" || raw === "HIGH" ? raw : "MEDIUM";
}

/**
 * Preuve réglementaire : le texte même de l'exigence, déjà chargé pour l'onglet
 * « Exigences ». C'est une citation exacte, pas une approximation.
 */
export function buildRegulatoryEvidence(
  requirement: Requirement,
  regulationTitle: string,
): EvidenceRef {
  return {
    document_id: requirement.source_document_id,
    document_title: regulationTitle,
    section_reference: requirement.source_reference,
    excerpt: requirement.source_text,
    language: requirement.language,
  };
}

/** Assemble un `Finding` pour un couple exigence × procédure réellement mappé. */
export function assembleMappedFinding(input: {
  mapping: BackendMapping;
  requirement: Requirement;
  /** `risk_level` du nœud imbriqué — absent du `Requirement` déjà adapté (le contrat
   * n'a pas ce champ), il faut donc le faire suivre depuis la réponse brute. */
  riskLevel: string | null | undefined;
  regulationTitle: string;
  procedure: BackendProcedureMinimal;
  /** Assigné de l'escalade, lu dans `mapping_history` (`resources.ts::fetchEscalationAssignees`). */
  escalationAssignee?: string;
}): Finding {
  const { mapping, requirement, riskLevel, regulationTitle, procedure } = input;

  return {
    finding_id: mapping.mapping_id,
    requirement_id: mapping.requirement_id,
    procedure_id: mapping.procedure_id,
    procedure_title: procedure.name?.trim() || undefined,
    assessment: adaptAssessment(mapping.assessment),
    regulatory_evidence: [buildRegulatoryEvidence(requirement, regulationTitle)],
    internal_evidence: [],
    explanation: mapping.explanation ?? "",
    explanation_fr: mapping.explanation_lang_fr ?? undefined,
    missing_or_ambiguous_elements: [],
    recommended_action: mapping.recommended_action ?? "",
    recommended_action_fr: mapping.recommended_action_lang_fr ?? undefined,
    priority: adaptPriorityFromRiskLevel(riskLevel),
    confidence_or_evidence_strength: mapping.confidence ?? undefined,
    human_status: adaptHumanStatus(mapping.human_status),
    // Le mapping lui-même ne porte plus d'assigné côté backend (`MappingRead`) : sans la
    // valeur relue dans l'historique, un constat escaladé redevenait « Non assigné ».
    assignee_id: input.escalationAssignee ?? mapping.assignee ?? undefined,
    // Le backend ne date pas ses constats : horodatage de synchronisation, pas une
    // vraie date de dernière décision (il n'y a pas encore de validation humaine réelle).
    updated_at: new Date().toISOString(),
  };
}

/**
 * Assemble un `Finding` pour une exigence sans aucune procédure mise en
 * correspondance — même état que « Aucune procédure pertinente trouvée » du corpus
 * mock : preuve réglementaire seule, pas de preuve interne (il n'y en a pas).
 */
export function assembleUnmappedFinding(input: {
  requirement: Requirement;
  riskLevel: string | null | undefined;
  regulationTitle: string;
}): Finding {
  const { requirement, riskLevel, regulationTitle } = input;

  return {
    finding_id: `NO-MAPPING-${requirement.requirement_id}`,
    requirement_id: requirement.requirement_id,
    procedure_id: null,
    assessment: "NO_RELEVANT_PROCEDURE",
    regulatory_evidence: [buildRegulatoryEvidence(requirement, regulationTitle)],
    internal_evidence: [],
    explanation: "",
    missing_or_ambiguous_elements: [],
    recommended_action: "",
    priority: adaptPriorityFromRiskLevel(riskLevel),
    human_status: "PENDING",
    updated_at: new Date().toISOString(),
  };
}
