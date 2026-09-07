/**
 * Source unique du mapping statut -> couleur.
 *
 * Palette figée dans `docs/ui-guidelines.md` : ces 5 couleurs sont réservées aux
 * valeurs d'`assessment` et ne doivent jamais servir à autre chose. Ne pas coder de
 * couleur de statut en dur ailleurs dans l'application — passer par ce fichier.
 */
import type { Assessment, HumanStatus, Priority } from "@/types/api";

/** Ordre d'affichage stable (légendes, filtres, graphiques). */
export const assessmentValues = [
  "COVERED",
  "PARTIAL",
  "POTENTIAL_GAP",
  "NO_RELEVANT_PROCEDURE",
  "EXPERT_REVIEW",
] as const satisfies readonly Assessment[];

export const priorityValues = ["HIGH", "MEDIUM", "LOW"] as const satisfies
  readonly Priority[];

export const humanStatusValues = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "ESCALATED",
] as const satisfies readonly HumanStatus[];

/** Classes du badge : fond teinté + texte sombre lisible (jamais la couleur seule). */
export const assessmentBadgeClass: Record<Assessment, string> = {
  COVERED: "border-covered/35 bg-covered/12 text-covered-ink",
  PARTIAL: "border-partial/40 bg-partial/16 text-partial-ink",
  POTENTIAL_GAP: "border-gap/35 bg-gap/12 text-gap-ink",
  NO_RELEVANT_PROCEDURE: "border-noproc/40 bg-noproc/14 text-noproc-ink",
  EXPERT_REVIEW: "border-expert/35 bg-expert/12 text-expert-ink",
};

/** Aplat plein — barres de graphique, pastilles de légende. */
export const assessmentSolidClass: Record<Assessment, string> = {
  COVERED: "bg-covered",
  PARTIAL: "bg-partial",
  POTENTIAL_GAP: "bg-gap",
  NO_RELEVANT_PROCEDURE: "bg-noproc",
  EXPERT_REVIEW: "bg-expert",
};

/** Variables CSS à passer à Recharts (qui attend une couleur, pas une classe). */
export const assessmentColorVar: Record<Assessment, string> = {
  COVERED: "var(--covered)",
  PARTIAL: "var(--partial)",
  POTENTIAL_GAP: "var(--gap)",
  NO_RELEVANT_PROCEDURE: "var(--noproc)",
  EXPERT_REVIEW: "var(--expert)",
};

/**
 * Palette catégorielle des graphiques (8 slots, ordre figé).
 * Distincte des couleurs de statut, volontairement.
 */
const categoricalColorVars = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
  "var(--cat-8)",
] as const;

export function categoricalColor(index: number): string {
  return categoricalColorVars[index % categoricalColorVars.length];
}

/**
 * La priorité et le statut de validation humaine utilisent des styles neutres :
 * les 5 teintes de statut leur sont interdites pour rester univoques.
 */
export const priorityBadgeClass: Record<Priority, string> = {
  HIGH: "border-foreground/25 bg-foreground/10 text-foreground font-semibold",
  MEDIUM: "border-foreground/15 bg-foreground/5 text-foreground/80",
  LOW: "border-transparent bg-transparent text-muted-foreground",
};

export const priorityRank: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export function sortByPriority<T extends { priority: Priority }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
  );
}
