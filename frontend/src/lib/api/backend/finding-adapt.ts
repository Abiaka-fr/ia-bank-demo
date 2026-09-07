/**
 * Traduction couples exigence × procédure (backend, `POST db41421`) -> `Finding` du
 * contrat. Fonctions pures, testées — même principe que `adapt.ts`.
 *
 * ⚠️ Limite assumée, à documenter dans toute démo utilisant ce mode : le backend ne
 * relie pas un couple exigence × procédure à un passage précis du document interne
 * (pas de `chunk_id` sur `RequirementProcedureMap`). `regulatory_evidence` peut donc
 * citer un passage exact (le texte de l'exigence elle-même, déjà chargé), mais
 * `internal_evidence` ne peut être qu'un extrait non ciblé du début du document —
 * jamais un texte inventé, seulement moins précis. Voir `resources.ts`.
 */
import type {
  Assessment,
  DocumentDetail,
  EvidenceRef,
  Finding,
  HumanStatus,
  Priority,
  Requirement,
} from "@/types/api";

import type { BackendMapping, BackendProcedureMinimal } from "./schemas";

/** Longueur de l'extrait non ciblé pris en tête de document — au-delà, la carte de
 * preuve deviendrait illisible pour ce qui reste une approximation. */
const UNTARGETED_EXCERPT_LENGTH = 400;

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
 * La base de référence ne contient que `PENDING_REVIEW` : les autres valeurs sont
 * gérées par prudence, si le backend les introduit un jour.
 */
export function adaptHumanStatus(raw: string | null | undefined): HumanStatus {
  switch (raw) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "REJECTED":
      return "REJECTED";
    case "ESCALATED":
      return "ESCALATED";
    case "PENDING_REVIEW":
    default:
      return "PENDING";
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

/**
 * Preuve interne : un extrait non ciblé, honnêtement présenté comme tel. Le passage
 * étant un vrai préfixe du document (jamais inventé), `findQuotedLineIndexes` le
 * localise et le surligne normalement dans la fenêtre de lecture ; le libellé de
 * section ne prétend pas à une précision que le mapping ne fournit pas.
 */
export function buildUntargetedInternalEvidence(
  document: DocumentDetail,
  procedure: BackendProcedureMinimal,
): EvidenceRef | null {
  const excerpt = document.extracted_text.slice(0, UNTARGETED_EXCERPT_LENGTH).trim();
  if (!excerpt) return null;

  return {
    document_id: document.document_id,
    document_title: procedure.name?.trim() || document.title,
    // Pas de texte anglais équivalent ici : comme `explanation`/`recommended_action`,
    // ce libellé vient du backend et n'est pas encore localisable (voir
    // docs/backend-integration.md, point ouvert n°5).
    section_reference: "Début du document (passage non ciblé par le mapping)",
    excerpt,
    language: document.language,
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
  procedureDocument: DocumentDetail | null;
}): Finding {
  const { mapping, requirement, riskLevel, regulationTitle, procedure, procedureDocument } =
    input;

  const internalEvidence = procedureDocument
    ? buildUntargetedInternalEvidence(procedureDocument, procedure)
    : null;

  return {
    finding_id: mapping.mapping_id,
    requirement_id: mapping.requirement_id,
    procedure_id: mapping.procedure_id,
    assessment: adaptAssessment(mapping.assessment),
    regulatory_evidence: [buildRegulatoryEvidence(requirement, regulationTitle)],
    internal_evidence: internalEvidence ? [internalEvidence] : [],
    explanation: mapping.explanation ?? "",
    missing_or_ambiguous_elements: [],
    recommended_action: mapping.recommended_action ?? "",
    priority: adaptPriorityFromRiskLevel(riskLevel),
    confidence_or_evidence_strength: mapping.confidence ?? undefined,
    human_status: adaptHumanStatus(mapping.human_status),
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
