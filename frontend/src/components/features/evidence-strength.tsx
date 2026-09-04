"use client";

import { useTranslations } from "next-intl";

/**
 * Indicateur d'aide à la décision — jamais présenté comme une certitude juridique
 * (`docs/ui-guardrails.md`).
 */
export function EvidenceStrength({ value }: { value: number | undefined }) {
  const t = useTranslations("evidence");

  if (value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const percent = Math.round(value * 100);

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
          className="block h-full rounded-full bg-foreground/60"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="tabular-nums text-xs text-muted-foreground">
        {percent}%
      </span>
    </span>
  );
}
