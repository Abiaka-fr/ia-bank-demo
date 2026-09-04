import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { EvidenceRef } from "@/types/api";

import { EvidenceCard } from "./evidence-card";

const englishEvidence: EvidenceRef = {
  document_id: "REG-EBA-GL-2026-03",
  document_title: "EBA/GL/2026/03 — Wire Transfer Information",
  section_reference: "Guideline 3",
  excerpt:
    "For any transfer of funds equal to or exceeding EUR 1,000, the payment service provider of the payer shall ensure that the transfer is accompanied by the name of the payer.",
  language: "EN",
};

describe("EvidenceCard", () => {
  it("affiche toujours la source de la preuve (document + section)", () => {
    renderWithProviders(<EvidenceCard evidence={englishEvidence} />);

    expect(screen.getByText(englishEvidence.document_id)).toBeInTheDocument();
    expect(screen.getByText(englishEvidence.document_title)).toBeInTheDocument();
    expect(
      screen.getByText(englishEvidence.section_reference),
    ).toBeInTheDocument();
  });

  it("ne traduit pas l'extrait et le marque dans sa langue d'origine", () => {
    renderWithProviders(<EvidenceCard evidence={englishEvidence} />);

    const quote = screen.getByText(englishEvidence.excerpt);
    expect(quote).toHaveAttribute("lang", "en");
  });
});
