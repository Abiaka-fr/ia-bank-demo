"use client";

import { useTranslations } from "next-intl";

/**
 * Indicateur d'aide à la décision — jamais présenté comme une certitude juridique
 * (`docs/ui-guardrails.md`).
 *
 * Coloré rouge/jaune/vert selon le niveau (demande explicite de Giang, qui étend le
 * principe déjà établi pour `assessment` à un second signal de magnitude — voir
 * `docs/ui-guidelines.md` § « Où la couleur a le droit d'apparaître »). Réutilise les
 * variables `--gap`/`--partial`/`--covered` déjà validées, plutôt qu'une palette ad hoc.
 */
const LOW_THRESHOLD = 0.4;
const HIGH_THRESHOLD = 0.75;

function strengthColorVar(value: number): string {
  if (value < LOW_THRESHOLD) return "var(--gap)";
  if (value < HIGH_THRESHOLD) return "var(--partial)";
  return "var(--covered)";
}

export function EvidenceStrength({ value }: { value: number | undefined }) {
  const t = useTranslations("evidence");

  if (value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const percent = Math.round(value * 100);
  const color = strengthColorVar(value);

  return (
    <span
      className="inline-flex items-center gap-2"
      title={t("evidenceStrengthHelp")}
    >
      <span
        aria-hidden
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </span>
      <span className="tabular-nums text-xs text-muted-foreground">
        {percent}%
      </span>
    </span>
  );
}
