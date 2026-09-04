import { describe, expect, it } from "vitest";

import { seedFindings } from "./data/findings";
import { requirements } from "./data/requirements";
import { buildDashboardSummary } from "./summary";

describe("buildDashboardSummary", () => {
  it("compte les exigences, les écarts potentiels et les revues expert", () => {
    // Arrange
    const allRequirements = requirements;
    const allFindings = seedFindings;

    // Act
    const summary = buildDashboardSummary(allRequirements, allFindings);

    // Assert
    expect(summary.requirements_identified).toBe(allRequirements.length);
    expect(summary.potential_gaps).toBe(
      allFindings.filter((f) => f.assessment === "POTENTIAL_GAP").length,
    );
    expect(summary.expert_reviews_required).toBe(
      allFindings.filter((f) => f.assessment === "EXPERT_REVIEW").length,
    );
  });

  it("ne compte chaque procédure impactée qu'une seule fois", () => {
    const summary = buildDashboardSummary(requirements, seedFindings);
    const distinctProcedures = new Set(
      seedFindings.flatMap((finding) => finding.matched_procedure_ids),
    );

    expect(summary.procedures_impacted).toBe(distinctProcedures.size);
  });

  it("expose les 5 statuts d'évaluation même à zéro", () => {
    const summary = buildDashboardSummary(requirements, []);

    expect(summary.by_assessment).toHaveLength(5);
    expect(summary.by_assessment.every((entry) => entry.count === 0)).toBe(true);
  });

  it("classe les constats prioritaires en tête", () => {
    const summary = buildDashboardSummary(requirements, seedFindings);

    expect(summary.top_priority_findings[0]?.priority).toBe("HIGH");
    expect(summary.top_priority_findings.length).toBeLessThanOrEqual(5);
  });

  it("retourne un résumé vide quand aucune régulation n'est analysée", () => {
    const summary = buildDashboardSummary([], []);

    expect(summary.requirements_identified).toBe(0);
    expect(summary.by_domain).toEqual([]);
    expect(summary.top_priority_findings).toEqual([]);
  });
});
