import { describe, expect, it } from "vitest";

import type { DocumentDetail, Requirement } from "@/types/api";

import type { BackendMapping, BackendProcedureMinimal } from "./schemas";
import {
  adaptAssessment,
  adaptHumanStatus,
  adaptPriorityFromRiskLevel,
  assembleMappedFinding,
  assembleUnmappedFinding,
  buildRegulatoryEvidence,
  buildUntargetedInternalEvidence,
} from "./finding-adapt";

function requirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    requirement_id: "REQ-0001",
    source_document_id: "EXT-EU-AML-001",
    source_reference: "Section 3",
    source_text: "Customers must be classified using documented risk factors.",
    normalized_requirement: "Risk classification",
    domain: ["AML/CFT"],
    impacted_activity: [],
    language: "EN",
    ...overrides,
  };
}

function mapping(overrides: Partial<BackendMapping> = {}): BackendMapping {
  return {
    mapping_id: "MAP-0001",
    requirement_id: "REQ-0001",
    procedure_id: "PRC-AML-007",
    assessment: "COVERED",
    confidence: 0.93,
    explanation: "Explication de démonstration.",
    recommended_action: "Aucune action requise.",
    human_status: "PENDING_REVIEW",
    ...overrides,
  };
}

function procedure(overrides: Partial<BackendProcedureMinimal> = {}): BackendProcedureMinimal {
  return {
    procedure_id: "PRC-AML-007",
    document_id: "INT-PROC-AML",
    name: "Risk Classification Process",
    domain: "AML/CFT",
    owner: null,
    status: "ACTIVE",
    current_version: "3.0",
    ...overrides,
  };
}

function documentDetail(overrides: Partial<DocumentDetail> = {}): DocumentDetail {
  return {
    document_id: "INT-PROC-AML",
    title: "Risk Classification Process",
    document_type: "INTERNAL_PROCEDURE",
    authority_or_owner: "",
    domain: ["AML/CFT"],
    language: "EN",
    version: "3.0",
    status: "NOT_ANALYZED",
    extracted_text: "First paragraph of the procedure.\n\nSecond paragraph.",
    ...overrides,
  };
}

describe("adaptAssessment", () => {
  it("traduit les 4 valeurs connues de la base", () => {
    expect(adaptAssessment("COVERED")).toBe("COVERED");
    expect(adaptAssessment("PARTIALLY_COVERED")).toBe("PARTIAL");
    expect(adaptAssessment("POTENTIAL_GAP")).toBe("POTENTIAL_GAP");
    expect(adaptAssessment("HUMAN_REVIEW")).toBe("EXPERT_REVIEW");
  });

  it("retombe sur EXPERT_REVIEW plutôt que sur COVERED pour une valeur inconnue", () => {
    // Ne jamais affirmer une couverture qu'on ne peut pas garantir.
    expect(adaptAssessment(null)).toBe("EXPERT_REVIEW");
    expect(adaptAssessment(undefined)).toBe("EXPERT_REVIEW");
    expect(adaptAssessment("AUTRE_CHOSE")).toBe("EXPERT_REVIEW");
  });
});

describe("adaptHumanStatus", () => {
  it("traduit PENDING_REVIEW en PENDING", () => {
    expect(adaptHumanStatus("PENDING_REVIEW")).toBe("PENDING");
  });

  it("laisse passer les décisions déjà prises", () => {
    expect(adaptHumanStatus("ACCEPTED")).toBe("ACCEPTED");
    expect(adaptHumanStatus("REJECTED")).toBe("REJECTED");
    expect(adaptHumanStatus("ESCALATED")).toBe("ESCALATED");
  });

  it("retombe sur PENDING pour une valeur absente ou inconnue", () => {
    expect(adaptHumanStatus(null)).toBe("PENDING");
    expect(adaptHumanStatus("AUTRE_CHOSE")).toBe("PENDING");
  });
});

describe("adaptPriorityFromRiskLevel", () => {
  it("passe LOW/MEDIUM/HIGH tel quel — mêmes valeurs que Priority", () => {
    expect(adaptPriorityFromRiskLevel("LOW")).toBe("LOW");
    expect(adaptPriorityFromRiskLevel("MEDIUM")).toBe("MEDIUM");
    expect(adaptPriorityFromRiskLevel("HIGH")).toBe("HIGH");
  });

  it("retombe sur MEDIUM pour une valeur absente ou inconnue", () => {
    expect(adaptPriorityFromRiskLevel(null)).toBe("MEDIUM");
    expect(adaptPriorityFromRiskLevel(undefined)).toBe("MEDIUM");
    expect(adaptPriorityFromRiskLevel("URGENT")).toBe("MEDIUM");
  });
});

describe("buildRegulatoryEvidence", () => {
  it("cite le texte exact de l'exigence, pas une approximation", () => {
    // Arrange
    const req = requirement();
    // Act
    const evidence = buildRegulatoryEvidence(req, "EU AML/CFT Standard");
    // Assert
    expect(evidence).toEqual({
      document_id: "EXT-EU-AML-001",
      document_title: "EU AML/CFT Standard",
      section_reference: "Section 3",
      excerpt: "Customers must be classified using documented risk factors.",
      language: "EN",
    });
  });
});

describe("buildUntargetedInternalEvidence", () => {
  it("prend un vrai préfixe du document, jamais un texte inventé", () => {
    // Arrange
    const document = documentDetail();
    // Act
    const evidence = buildUntargetedInternalEvidence(document, procedure());
    // Assert
    expect(evidence?.excerpt).toBe(
      "First paragraph of the procedure.\n\nSecond paragraph.",
    );
    expect(document.extracted_text).toContain(evidence?.excerpt ?? "");
  });

  it("renvoie null si le document n'a pas de texte extrait", () => {
    // Arrange
    const document = documentDetail({ extracted_text: "" });
    // Act / Assert
    expect(buildUntargetedInternalEvidence(document, procedure())).toBeNull();
  });
});

describe("assembleMappedFinding", () => {
  it("assemble un constat complet à partir d'un couple mappé", () => {
    // Arrange / Act
    const finding = assembleMappedFinding({
      mapping: mapping(),
      requirement: requirement(),
      riskLevel: "HIGH",
      regulationTitle: "EU AML/CFT Standard",
      procedure: procedure(),
      procedureDocument: documentDetail(),
    });
    // Assert
    expect(finding.assessment).toBe("COVERED");
    expect(finding.priority).toBe("HIGH");
    expect(finding.human_status).toBe("PENDING");
    expect(finding.procedure_id).toBe("PRC-AML-007");
    expect(finding.regulatory_evidence).toHaveLength(1);
    expect(finding.internal_evidence).toHaveLength(1);
    expect(finding.confidence_or_evidence_strength).toBe(0.93);
  });

  it("laisse internal_evidence vide si le document de la procédure n'a pas pu être chargé", () => {
    // Un constat garde tout de même sa preuve réglementaire : jamais entièrement nu.
    const finding = assembleMappedFinding({
      mapping: mapping(),
      requirement: requirement(),
      riskLevel: null,
      regulationTitle: "EU AML/CFT Standard",
      procedure: procedure(),
      procedureDocument: null,
    });
    expect(finding.internal_evidence).toEqual([]);
    expect(finding.regulatory_evidence).toHaveLength(1);
  });
});

describe("assembleUnmappedFinding", () => {
  it("assemble un constat NO_RELEVANT_PROCEDURE sans preuve interne", () => {
    // Arrange / Act
    const finding = assembleUnmappedFinding({
      requirement: requirement(),
      riskLevel: "LOW",
      regulationTitle: "EU AML/CFT Standard",
    });
    // Assert
    expect(finding.assessment).toBe("NO_RELEVANT_PROCEDURE");
    expect(finding.procedure_id).toBeNull();
    expect(finding.priority).toBe("LOW");
    expect(finding.internal_evidence).toEqual([]);
    expect(finding.regulatory_evidence).toHaveLength(1);
  });
});
