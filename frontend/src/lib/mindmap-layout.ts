/**
 * Calcul de la disposition de la carte mentale.
 *
 * Arbre couché de gauche à droite : chaque feuille occupe une ligne, chaque parent
 * se centre verticalement sur ses enfants. Séparé du rendu pour rester testable
 * sans DOM.
 */
import type { RegulationMapNode } from "@/types/api";

export type MindmapInput = {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  /** Index de la palette catégorielle, hérité par la branche. */
  colorIndex?: number;
  children?: MindmapInput[];
};

export type MindmapNode = {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  depth: number;
  colorIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MindmapEdge = {
  id: string;
  path: string;
  colorIndex: number;
};

export type MindmapLayout = {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  width: number;
  height: number;
};

/** Largeur allouée par profondeur ; au-delà, on réutilise la dernière. */
const COLUMN_WIDTHS = [252, 156, 190, 178];
const COLUMN_GAP = 56;
const ROW_HEIGHT = 46;
const NODE_HEIGHT = 38;
const PADDING = 12;

function columnWidth(depth: number): number {
  return COLUMN_WIDTHS[Math.min(depth, COLUMN_WIDTHS.length - 1)];
}

function columnX(depth: number): number {
  let x = PADDING;
  for (let level = 0; level < depth; level += 1) {
    x += columnWidth(level) + COLUMN_GAP;
  }
  return x;
}

/** Courbe de Bézier horizontale entre le bord droit du parent et le bord gauche de l'enfant. */
function edgePath(
  parent: MindmapNode,
  child: MindmapNode,
): string {
  const x1 = parent.x + parent.width;
  const y1 = parent.y + parent.height / 2;
  const x2 = child.x;
  const y2 = child.y + child.height / 2;
  const dx = Math.max((x2 - x1) / 2, 16);

  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export function layoutMindmap(roots: readonly MindmapInput[]): MindmapLayout {
  const nodes: MindmapNode[] = [];
  const edges: MindmapEdge[] = [];
  let nextRow = 0;

  function walk(
    input: MindmapInput,
    depth: number,
    inheritedColor: number,
  ): MindmapNode {
    const colorIndex = input.colorIndex ?? inheritedColor;
    const children = input.children ?? [];

    // Les enfants sont placés d'abord : un parent se centre sur eux.
    const childNodes = children.map((child) => walk(child, depth + 1, colorIndex));

    const y =
      childNodes.length === 0
        ? (() => {
            const row = nextRow;
            nextRow += 1;
            return PADDING + row * ROW_HEIGHT;
          })()
        : (childNodes[0].y + childNodes[childNodes.length - 1].y) / 2;

    const node: MindmapNode = {
      id: input.id,
      label: input.label,
      sublabel: input.sublabel,
      href: input.href,
      depth,
      colorIndex,
      x: columnX(depth),
      y,
      width: columnWidth(depth),
      height: NODE_HEIGHT,
    };

    nodes.push(node);
    for (const child of childNodes) {
      edges.push({
        id: `${node.id}->${child.id}`,
        path: edgePath(node, child),
        colorIndex: child.colorIndex,
      });
    }

    return node;
  }

  roots.forEach((root, index) => walk(root, 0, root.colorIndex ?? index));

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    nodes,
    edges,
    width: columnX(maxDepth) + columnWidth(maxDepth) + PADDING,
    height: Math.max(nextRow, 1) * ROW_HEIGHT + PADDING,
  };
}

/**
 * Une régulation est « entièrement traitée », pour la carte mentale, quand elle a au
 * moins un couple exigence × procédure et qu'aucun n'est plus `PENDING`. Une
 * régulation sans aucun couple (pas encore analysée) reste affichée — il n'y a rien à
 * masquer, juste rien à traiter pour l'instant.
 */
export function isMapNodeFullyHandled(node: RegulationMapNode): boolean {
  const procedures = node.requirements.flatMap((requirement) => requirement.procedures);
  return (
    procedures.length > 0 &&
    procedures.every((procedure) => procedure.human_status !== "PENDING")
  );
}
