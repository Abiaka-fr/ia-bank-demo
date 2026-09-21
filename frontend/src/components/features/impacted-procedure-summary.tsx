"use client";

import { cn } from "cn";
import { useLocale } from "next-intl";

import { pickLocalizedText } from "@/lib/localized-text";
import type { Finding } from "@/types/api";

/**
 * Procédure touchée par un constat (une ligne de `requirement_procedure_map`) : son nom,
 * ses identifiants et pourquoi le système l'a rapprochée de l'exigence. Partagé par
 * l'onglet « Exigences » et l'onglet « Analyse d'impact ».
 */
export function ImpactedProcedureSummary({
  finding,
  className,
}: {
  finding: Finding;
  className?: string;
}) {
  const locale = useLocale();
  // Nom porté par la preuve interne (`buildUntargetedInternalEvidence` en mode réel,
  // corpus MSW sinon) — l'identifiant seul ne parle pas à l'utilisateur.
  const title = finding.internal_evidence[0]?.document_title ?? finding.procedure_id ?? "—";
  const explanation = pickLocalizedText(locale, finding.explanation, finding.explanation_fr);

  return (
    <span className={cn("block min-w-0 space-y-1 text-left", className)}>
      <span className="block text-sm font-medium">{title}</span>
      <span className="block font-mono text-[11px] text-muted-foreground">
        {finding.procedure_id ?? "—"} · {finding.finding_id}
      </span>
      {explanation ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">{explanation}</span>
      ) : null}
    </span>
  );
}
