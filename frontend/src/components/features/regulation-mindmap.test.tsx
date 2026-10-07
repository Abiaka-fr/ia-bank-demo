import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { RegulationMapNode } from "@/types/api";

import { RegulationMindmap } from "./regulation-mindmap";

const map: RegulationMapNode[] = [
  {
    regulation_id: "REG-1",
    title: "Régulation test",
    status: "ANALYZED",
    requirements: [
      {
        requirement_id: "REQ-1",
        source_reference: "Art. 1",
        normalized_requirement: "Exigence test",
        procedures: [
          {
            finding_id: "F-1",
            procedure_id: "PROC-1",
            assessment: "PARTIAL",
            human_status: "PENDING",
          },
        ],
      },
    ],
  },
];

vi.mock("@/lib/api/dashboard", () => ({ fetchRegulationMap: async () => map }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("RegulationMindmap", () => {
  it("tableau de bord : seules les régulations, un clic déplie exigences et procédures", async () => {
    renderWithProviders(<RegulationMindmap />);

    const regulation = await screen.findByRole("button", { name: /Régulation test/ });
    expect(screen.queryByText("REQ-1")).not.toBeInTheDocument();

    fireEvent.click(regulation);
    expect(screen.getByText("REQ-1")).toBeInTheDocument();
    expect(screen.getByText("PROC-1")).toBeInTheDocument();

    fireEvent.click(regulation);
    expect(screen.queryByText("REQ-1")).not.toBeInTheDocument();
  });

  it("vue d'ensemble d'une régulation : tout est affiché, la régulation reste un lien", async () => {
    renderWithProviders(<RegulationMindmap regulationId="REG-1" />);

    expect(await screen.findByText("REQ-1")).toBeInTheDocument();
    expect(screen.getByText("PROC-1")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
