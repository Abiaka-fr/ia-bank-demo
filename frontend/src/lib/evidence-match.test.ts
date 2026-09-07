import { describe, expect, it } from "vitest";

import { procedures } from "@/lib/mocks/data/documents";
import { seedFindings } from "@/lib/mocks/data/findings";

import { findQuotedLineIndexes } from "./evidence-match";

function procedureText(procedureId: string): string {
  return (
    procedures.find((procedure) => procedure.document_id === procedureId)
      ?.extracted_text ?? ""
  );
}

describe("findQuotedLineIndexes", () => {
  it("localise un passage cité mot pour mot", () => {
    // Arrange
    const text = procedureText("KYC-004");
    const excerpt =
      seedFindings.find((finding) => finding.finding_id === "FND-003")
        ?.internal_evidence[0].excerpt ?? "";

    // Act
    const matched = findQuotedLineIndexes(text, excerpt);

    // Assert
    expect(matched.size).toBe(1);
    const [index] = [...matched];
    expect(text.split("\n")[index]).toContain("tous les deux (2) ans");
  });

  it("localise les deux passages d'un extrait coupé par « […] »", () => {
    const text = procedureText("CTRL-001");
    const excerpt =
      seedFindings.find((finding) => finding.finding_id === "FND-009")
        ?.internal_evidence[0].excerpt ?? "";

    const matched = findQuotedLineIndexes(text, excerpt);

    expect(matched.size).toBe(2);
    const lines = text.split("\n");
    const quoted = [...matched].map((index) => lines[index]);
    expect(quoted.some((line) => line.includes("formation continue"))).toBe(true);
    expect(quoted.some((line) => line.includes("Comité d'Audit"))).toBe(true);
  });

  it("ignore la numérotation de liste absente de l'extrait", () => {
    const text = "1. Première ligne suffisamment longue pour être distinguée.";
    const excerpt = "Première ligne suffisamment longue pour être distinguée.";

    expect(findQuotedLineIndexes(text, excerpt).size).toBe(1);
  });

  it("ne renvoie rien quand l'extrait ne figure pas dans le document", () => {
    const text = procedureText("KYC-004");

    expect(
      findQuotedLineIndexes(text, "Un texte totalement étranger au document indexé.")
        .size,
    ).toBe(0);
  });

  it("ne renvoie rien pour un extrait trop court pour être discriminant", () => {
    expect(findQuotedLineIndexes(procedureText("KYC-004"), "La Banque").size).toBe(0);
  });
});
