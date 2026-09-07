import { describe, expect, it } from "vitest";

import { seedFindings } from "./data/findings";
import { requirements } from "./data/requirements";
import { toMeta, regulations } from "./data/documents";
import {
  buildDashboardSummary,
  buildPortfolioSummary,
  buildRegulationMap,
  isRegulationFullyHandled,
} from "./summary";
import type { Finding, Requirement } from "@/types/api";

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
    // Plusieurs exigences peuvent viser la même procédure (contrat v1.1 : un
    // constat = un couple exigence × procédure).
    const summary = buildDashboardSummary(requirements, seedFindings);
    const distinctProcedures = new Set(
      seedFindings
        .map((finding) => finding.procedure_id)
        .filter((id): id is string => id !== null),
    );

    expect(summary.procedures_impacted).toBe(distinctProcedures.size);
  });

  it("compte les actions totales et celles restant à traiter", () => {
    const summary = buildDashboardSummary(requirements, seedFindings);

    expect(summary.actions_total).toBe(seedFindings.length);
    expect(summary.actions_pending).toBe(seedFindings.length);
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

describe("buildRegulationMap", () => {
  const requirementsOf = (regulationId: string) =>
    requirements.filter((r) => r.source_document_id === regulationId);
  const findingsOf = (regulationId: string) =>
    regulationId === "REG-ACPR-2026-04" ? seedFindings : [];

  it("relie chaque exigence à toutes les procédures qu'elle touche", () => {
    // Arrange + Act
    const map = buildRegulationMap(
      regulations.map(toMeta),
      requirementsOf,
      findingsOf,
    );

    // Assert : REQ-005 touche deux procédures, donc deux nœuds enfants.
    const acpr = map.find((node) => node.regulation_id === "REG-ACPR-2026-04");
    const req005 = acpr?.requirements.find((r) => r.requirement_id === "REQ-005");

    expect(req005?.procedures.map((p) => p.procedure_id).sort()).toEqual([
      "KYC-005",
      "SAN-001",
    ]);
  });

  it("garde l'exigence sans procédure correspondante, avec procedure_id null", () => {
    const map = buildRegulationMap(
      regulations.map(toMeta),
      requirementsOf,
      findingsOf,
    );
    const acpr = map.find((node) => node.regulation_id === "REG-ACPR-2026-04");
    const req004 = acpr?.requirements.find((r) => r.requirement_id === "REQ-004");

    expect(req004?.procedures).toHaveLength(1);
    expect(req004?.procedures[0].procedure_id).toBeNull();
  });

  it("laisse une régulation non analysée sans exigence", () => {
    const map = buildRegulationMap(
      regulations.map(toMeta),
      requirementsOf,
      findingsOf,
    );
    const eba = map.find((node) => node.regulation_id === "REG-EBA-GL-2026-03");

    expect(eba?.status).toBe("NOT_ANALYZED");
    expect(eba?.requirements).toEqual([]);
  });
});

describe("progression de la revue", () => {
  it("répartit les constats par décision humaine", () => {
    const summary = buildDashboardSummary(requirements, seedFindings);
    const pending = summary.by_human_status.find(
      (entry) => entry.human_status === "PENDING",
    );

    // Le corpus de démo part de zéro décision : tout est en attente.
    expect(summary.by_human_status).toHaveLength(4);
    expect(pending?.count).toBe(seedFindings.length);
  });
});


describe("buildPortfolioSummary", () => {
  const domain = ["AML/CFT"];

  function requirement(id: string): Requirement {
    return {
      requirement_id: id,
      source_document_id: "REG-1",
      source_reference: "Article 1",
      source_text: "…",
      normalized_requirement: "…",
      domain,
      impacted_activity: [],
      language: "FR",
    };
  }

  function finding(overrides: Partial<Finding>): Finding {
    return {
      finding_id: "FND-X",
      requirement_id: "REQ-1",
      procedure_id: "PRC-1",
      assessment: "POTENTIAL_GAP",
      regulatory_evidence: [],
      internal_evidence: [],
      explanation: "",
      missing_or_ambiguous_elements: [],
      recommended_action: "",
      priority: "MEDIUM",
      human_status: "PENDING",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("ne compte que les constats encore en attente dans les écarts et revues expert", () => {
    // Arrange : 2 constats POTENTIAL_GAP, un déjà accepté, un encore en attente.
    const findings = [
      finding({ finding_id: "FND-1", assessment: "POTENTIAL_GAP", human_status: "ACCEPTED" }),
      finding({ finding_id: "FND-2", assessment: "POTENTIAL_GAP", human_status: "PENDING" }),
    ];
    const regulations = [
      { document_id: "REG-1", title: "Reg", document_type: "REGULATION", authority_or_owner: "", domain, language: "FR", version: "1.0", status: "ANALYZED" } as const,
    ];

    // Act
    const summary = buildPortfolioSummary(
      regulations,
      () => [requirement("REQ-1")],
      () => findings,
    );

    // Assert : un seul des deux constats compte encore comme écart potentiel.
    expect(summary.potential_gaps).toBe(1);
    expect(summary.actions_pending).toBe(1);
    // Le compteur de périmètre, lui, ne bouge pas avec l'avancement de la revue.
    expect(summary.requirements_identified).toBe(1);
  });

  it("retire une exigence de « par domaine » une fois tous ses constats tranchés", () => {
    // Arrange : REQ-1 a un seul constat, déjà accepté -> plus rien à traiter dessus.
    const findings = [finding({ human_status: "ACCEPTED" })];
    const regulations = [
      { document_id: "REG-1", title: "Reg", document_type: "REGULATION", authority_or_owner: "", domain, language: "FR", version: "1.0", status: "ANALYZED" } as const,
    ];

    // Act
    const summary = buildPortfolioSummary(
      regulations,
      () => [requirement("REQ-1")],
      () => findings,
    );

    // Assert
    expect(summary.by_domain).toEqual([]);
  });

  it("garde une exigence sans aucun constat dans « par domaine » (pas encore analysée)", () => {
    const regulations = [
      { document_id: "REG-1", title: "Reg", document_type: "REGULATION", authority_or_owner: "", domain, language: "FR", version: "1.0", status: "ANALYZED" } as const,
    ];

    const summary = buildPortfolioSummary(
      regulations,
      () => [requirement("REQ-1")],
      () => [],
    );

    expect(summary.by_domain).toEqual([{ domain: "AML/CFT", count: 1 }]);
  });
});

describe("isRegulationFullyHandled", () => {
  it("est vrai quand il y a des constats et plus aucun en attente", () => {
    expect(isRegulationFullyHandled({ actions_total: 5, actions_pending: 0 })).toBe(true);
  });

  it("est faux tant qu'il reste au moins un constat en attente", () => {
    expect(isRegulationFullyHandled({ actions_total: 5, actions_pending: 1 })).toBe(false);
  });

  it("est faux pour une régulation sans aucun constat — rien à masquer", () => {
    expect(isRegulationFullyHandled({ actions_total: 0, actions_pending: 0 })).toBe(false);
  });
});
