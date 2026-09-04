import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { assessmentValues } from "@/lib/assessment";

import { AssessmentBadge } from "./assessment-badge";

describe("AssessmentBadge", () => {
  it.each(assessmentValues)(
    "affiche un libellé texte pour %s, jamais la couleur seule",
    (assessment) => {
      // Arrange + Act
      const { container } = renderWithProviders(
        <AssessmentBadge assessment={assessment} />,
      );

      // Assert : un libellé lisible ET une icône accompagnent la couleur.
      expect(container.textContent?.trim()).not.toBe("");
      expect(container.querySelector("svg")).toBeInTheDocument();
    },
  );

  it("utilise le vocabulaire figé du glossaire pour un écart potentiel", () => {
    renderWithProviders(<AssessmentBadge assessment="POTENTIAL_GAP" />);

    expect(screen.getByText("Écart potentiel")).toBeInTheDocument();
  });
});
