import type {
  Assessment,
  DashboardSummary,
  DocumentMeta,
  Finding,
  HumanStatus,
  PortfolioSummary,
  RegulationMapNode,
  RegulationSummary,
  Requirement,
} from "@/types/api";

import { assessmentValues, humanStatusValues, priorityRank } from "@/lib/assessment";

function countByHumanStatus(findings: readonly Finding[]) {
  return humanStatusValues.map((human_status) => ({
    human_status,
    count: findings.filter((finding) => finding.human_status === human_status)
      .length,
  }));
}

function countByAssessment(
  findings: readonly Finding[],
  assessment: Assessment,
): number {
  return findings.filter((finding) => finding.assessment === assessment).length;
}

/** Agrégats d'une régulation — même calcul que celui attendu du backend. */
export function buildDashboardSummary(
  requirements: readonly Requirement[],
  findings: readonly Finding[],
): DashboardSummary {
  // Un constat porte au plus une procédure (contrat v1.1) ; on dédoublonne pour ne
  // pas compter deux fois une procédure touchée par plusieurs exigences.
  const impactedProcedures = new Set(
    findings
      .map((finding) => finding.procedure_id)
      .filter((id): id is string => id !== null),
  );

  const domainCounts = new Map<string, number>();
  for (const requirement of requirements) {
    for (const domain of requirement.domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  return {
    requirements_identified: requirements.length,
    procedures_impacted: impactedProcedures.size,
    potential_gaps: countByAssessment(findings, "POTENTIAL_GAP"),
    expert_reviews_required: countByAssessment(findings, "EXPERT_REVIEW"),
    actions_pending: findings.filter(
      (finding) => finding.human_status === "PENDING",
    ).length,
    actions_total: findings.length,
    by_human_status: countByHumanStatus(findings),
    by_domain: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    by_assessment: assessmentValues.map((assessment) => ({
      assessment,
      count: countByAssessment(findings, assessment),
    })),
    top_priority_findings: [...findings]
      .sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          (b.confidence_or_evidence_strength ?? 0) -
            (a.confidence_or_evidence_strength ?? 0),
      )
      .slice(0, 5),
  };
}

/** Ne compte que les constats encore en attente — un constat déjà tranché (Accepté /
 * Rejeté / Escaladé) ne doit plus gonfler « Écarts potentiels » ou « Revues expert
 * requises » : ce sont des indicateurs de travail restant, pas un historique. */
function pendingOnly(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((finding) => finding.human_status === "PENDING");
}

/**
 * Une régulation est « entièrement traitée » quand elle a au moins un constat et
 * qu'aucun n'est plus en attente. Une régulation sans aucun constat (pas encore
 * analysée) n'est PAS considérée comme traitée — il n'y a simplement rien à traiter
 * pour l'instant, ce qui reste une information utile à afficher, pas à masquer.
 */
export function isRegulationFullyHandled(summary: {
  actions_total: number;
  actions_pending: number;
}): boolean {
  return summary.actions_total > 0 && summary.actions_pending === 0;
}

/**
 * Agrégats sur toutes les régulations (v1.1). Sert à la fois l'écran d'accueil et
 * les cartes de la liste des régulations — une seule requête pour les deux.
 *
 * `potential_gaps`, `expert_reviews_required`, `by_assessment` et `by_domain` ne
 * portent que sur le travail **restant** (constats encore `PENDING`) : une fois un
 * constat tranché par un humain, il ne doit plus compter dans « ce qu'il reste à
 * faire ». `requirements_identified` et `regulations_total` restent des compteurs de
 * périmètre (combien de texte a été indexé), non affectés par l'avancement de la revue.
 */
export function buildPortfolioSummary(
  regulations: readonly DocumentMeta[],
  requirementsOf: (regulationId: string) => readonly Requirement[],
  findingsOf: (regulationId: string) => readonly Finding[],
): PortfolioSummary {
  const byRegulation: RegulationSummary[] = regulations.map((regulation) => {
    const findings = findingsOf(regulation.document_id);
    const pending = pendingOnly(findings);
    // Une escalade peut confier un constat à quelqu'un d'autre que le responsable
    // de la régulation : on remonte ces personnes pour les afficher sur la carte.
    const escalatedAssigneeIds = [
      ...new Set(
        findings
          .filter(
            (finding) =>
              finding.human_status === "ESCALATED" &&
              finding.assignee_id &&
              finding.assignee_id !== regulation.assignee_id,
          )
          .map((finding) => finding.assignee_id as string),
      ),
    ];

    return {
      regulation_id: regulation.document_id,
      title: regulation.title,
      status: regulation.status,
      assignee_id: regulation.assignee_id,
      requirements_identified: requirementsOf(regulation.document_id).length,
      potential_gaps: countByAssessment(pending, "POTENTIAL_GAP"),
      expert_reviews_required: countByAssessment(pending, "EXPERT_REVIEW"),
      actions_pending: pending.length,
      actions_total: findings.length,
      by_human_status: countByHumanStatus(findings),
      escalated_assignee_ids: escalatedAssigneeIds,
    };
  });

  const allRequirements = regulations.flatMap((regulation) => [
    ...requirementsOf(regulation.document_id),
  ]);
  const allFindings = regulations.flatMap((regulation) => [
    ...findingsOf(regulation.document_id),
  ]);
  const pendingFindings = pendingOnly(allFindings);

  // Une exigence compte dans « par domaine » tant qu'il lui reste un constat en
  // attente, ou qu'elle n'a encore aucun constat (pas encore analysée) — mais plus
  // une fois que tous ses constats sont tranchés.
  const pendingRequirementIds = new Set(
    pendingFindings.map((finding) => finding.requirement_id),
  );
  const requirementIdsWithFindings = new Set(
    allFindings.map((finding) => finding.requirement_id),
  );
  const stillRelevantRequirements = allRequirements.filter(
    (requirement) =>
      !requirementIdsWithFindings.has(requirement.requirement_id) ||
      pendingRequirementIds.has(requirement.requirement_id),
  );

  const domainCounts = new Map<string, number>();
  for (const requirement of stillRelevantRequirements) {
    for (const domain of requirement.domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  return {
    regulations_total: regulations.length,
    regulations_analyzed: regulations.filter((r) => r.status === "ANALYZED").length,
    requirements_identified: allRequirements.length,
    potential_gaps: countByAssessment(pendingFindings, "POTENTIAL_GAP"),
    expert_reviews_required: countByAssessment(pendingFindings, "EXPERT_REVIEW"),
    actions_pending: pendingFindings.length,
    by_regulation: byRegulation,
    by_domain: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    by_assessment: assessmentValues.map((assessment) => ({
      assessment,
      count: countByAssessment(pendingFindings, assessment),
    })),
  };
}

/**
 * Arborescence Régulation → Exigence → Procédure alimentant la carte mentale.
 * Une exigence sans procédure correspondante garde son nœud, avec `procedure_id`
 * à `null` : l'absence de couverture est une information, pas un trou à masquer.
 */
export function buildRegulationMap(
  regulations: readonly DocumentMeta[],
  requirementsOf: (regulationId: string) => readonly Requirement[],
  findingsOf: (regulationId: string) => readonly Finding[],
): RegulationMapNode[] {
  return regulations.map((regulation) => {
    const findings = findingsOf(regulation.document_id);

    return {
      regulation_id: regulation.document_id,
      title: regulation.title,
      status: regulation.status,
      requirements: requirementsOf(regulation.document_id).map((requirement) => ({
        requirement_id: requirement.requirement_id,
        source_reference: requirement.source_reference,
        normalized_requirement: requirement.normalized_requirement,
        procedures: findings
          .filter((finding) => finding.requirement_id === requirement.requirement_id)
          .map((finding) => ({
            finding_id: finding.finding_id,
            procedure_id: finding.procedure_id,
            assessment: finding.assessment,
            human_status: finding.human_status satisfies HumanStatus,
          })),
      })),
    };
  });
}
