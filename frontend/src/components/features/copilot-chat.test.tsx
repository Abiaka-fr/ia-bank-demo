import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { CopilotChat } from "./copilot-chat";

const session = vi.hoisted(() => ({ userId: "USR-1" }));
vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({ user: { user_id: session.userId } }),
}));

const stored = [
  {
    id: "conv-1",
    turns: [{ question: "Combien d'exigences ?", answer: { answer: "100.", evidence: [] } }],
  },
];

describe("CopilotChat — historique", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("ia-bank.copilot.USR-1", JSON.stringify(stored));
    Element.prototype.scrollIntoView = vi.fn();
    session.userId = "USR-1";
  });

  it("reprend la dernière conversation de l'utilisateur, et en ouvre une vide sur demande", () => {
    const { unmount } = renderWithProviders(<CopilotChat />);
    expect(screen.getAllByText("Combien d'exigences ?").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Nouvelle conversation/ }));
    expect(screen.queryByText("100.")).not.toBeInTheDocument();

    // Rien n'a été perdu : un nouveau montage (rechargement, FR↔EN) la retrouve.
    unmount();
    renderWithProviders(<CopilotChat />);
    expect(screen.getByText("100.")).toBeInTheDocument();
  });

  it("n'affiche pas l'historique d'un autre utilisateur", () => {
    session.userId = "USR-2";
    renderWithProviders(<CopilotChat />);
    expect(screen.queryByText("100.")).not.toBeInTheDocument();
  });
});
