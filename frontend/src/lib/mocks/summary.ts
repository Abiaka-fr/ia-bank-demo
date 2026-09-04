import type { Assessment, DashboardSummary, Finding, Requirement } from "@/types/api";

import { assessmentValues } from "@/lib/assessment";

/** Agrège les constats en `DashboardSummary` — même calcul que celui attendu du backend. */
export function buildDashboardSummary(
  requirements: readonly Requirement[],
  findings: readonly Finding[],
): DashboardSummary {
  const impactedProcedures = new Set(
    findings.flatMap((finding) => finding.matched_procedure_ids),
  );

  const domainCounts = new Map<string, number>();
  for (const requirement of requirements) {
    for (const domain of requirement.domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  const countByAssessment = (assessment: Assessment) =>
    findings.filter((finding) => finding.assessment === assessment).length;

  const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

  return {
    requirements_identified: requirements.length,
    procedures_impacted: impactedProcedures.size,
    potential_gaps: countByAssessment("POTENTIAL_GAP"),
    expert_reviews_required: countByAssessment("EXPERT_REVIEW"),
    actions_pending: findings.filter(
      (finding) => finding.human_status === "PENDING",
    ).length,
    by_domain: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    by_assessment: assessmentValues.map((assessment) => ({
      assessment,
      count: countByAssessment(assessment),
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
