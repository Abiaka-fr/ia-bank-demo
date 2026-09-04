import type {
  Assessment,
  DashboardSummary,
  DocumentMeta,
  Finding,
  PortfolioSummary,
  RegulationSummary,
  Requirement,
} from "@/types/api";

import { assessmentValues, priorityRank } from "@/lib/assessment";

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

/**
 * Agrégats sur toutes les régulations (v1.1). Sert à la fois l'écran d'accueil et
 * les cartes de la liste des régulations — une seule requête pour les deux.
 */
export function buildPortfolioSummary(
  regulations: readonly DocumentMeta[],
  requirementsOf: (regulationId: string) => readonly Requirement[],
  findingsOf: (regulationId: string) => readonly Finding[],
): PortfolioSummary {
  const byRegulation: RegulationSummary[] = regulations.map((regulation) => {
    const findings = findingsOf(regulation.document_id);
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
      potential_gaps: countByAssessment(findings, "POTENTIAL_GAP"),
      expert_reviews_required: countByAssessment(findings, "EXPERT_REVIEW"),
      actions_pending: findings.filter((f) => f.human_status === "PENDING").length,
      actions_total: findings.length,
      escalated_assignee_ids: escalatedAssigneeIds,
    };
  });

  const allRequirements = regulations.flatMap((regulation) => [
    ...requirementsOf(regulation.document_id),
  ]);
  const allFindings = regulations.flatMap((regulation) => [
    ...findingsOf(regulation.document_id),
  ]);

  const domainCounts = new Map<string, number>();
  for (const requirement of allRequirements) {
    for (const domain of requirement.domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  return {
    regulations_total: regulations.length,
    regulations_analyzed: regulations.filter((r) => r.status === "ANALYZED").length,
    requirements_identified: allRequirements.length,
    potential_gaps: countByAssessment(allFindings, "POTENTIAL_GAP"),
    expert_reviews_required: countByAssessment(allFindings, "EXPERT_REVIEW"),
    actions_pending: allFindings.filter((f) => f.human_status === "PENDING").length,
    by_regulation: byRegulation,
    by_domain: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    by_assessment: assessmentValues.map((assessment) => ({
      assessment,
      count: countByAssessment(allFindings, assessment),
    })),
  };
}
