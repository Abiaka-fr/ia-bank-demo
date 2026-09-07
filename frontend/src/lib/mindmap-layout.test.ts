import { describe, expect, it } from "vitest";

import { isMapNodeFullyHandled, layoutMindmap, type MindmapInput } from "./mindmap-layout";
import type { RegulationMapNode } from "@/types/api";

const tree: MindmapInput[] = [
  {
    id: "reg",
    label: "Régulation",
    children: [
      {
        id: "req-1",
        label: "REQ-001",
        children: [
          { id: "f-1", label: "KYC-001" },
          { id: "f-2", label: "KYC-003" },
        ],
      },
      { id: "req-2", label: "REQ-002", children: [{ id: "f-3", label: "KYC-004" }] },
    ],
  },
];

describe("layoutMindmap", () => {
  it("donne une ligne à chaque feuille, sans chevauchement", () => {
    const { nodes } = layoutMindmap(tree);
    const leafYs = ["f-1", "f-2", "f-3"].map(
      (id) => nodes.find((node) => node.id === id)!.y,
    );

    expect(new Set(leafYs).size).toBe(3);
    expect([...leafYs].sort((a, b) => a - b)).toEqual(leafYs);
  });

  it("centre un parent sur ses enfants", () => {
    const { nodes } = layoutMindmap(tree);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get("req-1")!.y).toBe(
      (byId.get("f-1")!.y + byId.get("f-2")!.y) / 2,
    );
    expect(byId.get("reg")!.y).toBe(
      (byId.get("req-1")!.y + byId.get("req-2")!.y) / 2,
    );
  });

  it("décale chaque profondeur vers la droite", () => {
    const { nodes } = layoutMindmap(tree);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get("reg")!.x).toBeLessThan(byId.get("req-1")!.x);
    expect(byId.get("req-1")!.x).toBeLessThan(byId.get("f-1")!.x);
  });

  it("produit une arête par lien parent-enfant", () => {
    const { edges } = layoutMindmap(tree);

    expect(edges).toHaveLength(5);
    expect(edges.every((edge) => edge.path.startsWith("M "))).toBe(true);
  });

  it("fait hériter la couleur de la branche aux descendants", () => {
    const { nodes } = layoutMindmap([{ ...tree[0], colorIndex: 3 }]);

    expect(nodes.every((node) => node.colorIndex === 3)).toBe(true);
  });

  it("traite un nœud sans enfant comme une feuille", () => {
    const { nodes, height } = layoutMindmap([{ id: "seul", label: "Seul" }]);

    expect(nodes).toHaveLength(1);
    expect(height).toBeGreaterThan(0);
  });
});

describe("isMapNodeFullyHandled", () => {
  function node(procedures: { human_status: "PENDING" | "ACCEPTED" | "REJECTED" | "ESCALATED" }[]): RegulationMapNode {
    return {
      regulation_id: "REG-1",
      title: "Reg",
      status: "ANALYZED",
      requirements: [
        {
          requirement_id: "REQ-1",
          source_reference: "Article 1",
          normalized_requirement: "…",
          procedures: procedures.map((p, index) => ({
            finding_id: `FND-${index}`,
            procedure_id: "PRC-1",
            assessment: "COVERED",
            human_status: p.human_status,
          })),
        },
      ],
    };
  }

  it("est vrai quand tous les couples sont tranchés", () => {
    expect(
      isMapNodeFullyHandled(node([{ human_status: "ACCEPTED" }, { human_status: "REJECTED" }])),
    ).toBe(true);
  });

  it("est faux tant qu'un couple reste en attente", () => {
    expect(
      isMapNodeFullyHandled(node([{ human_status: "ACCEPTED" }, { human_status: "PENDING" }])),
    ).toBe(false);
  });

  it("est faux pour une régulation sans aucun couple — rien à masquer", () => {
    expect(isMapNodeFullyHandled(node([]))).toBe(false);
  });
});
