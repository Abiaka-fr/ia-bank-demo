"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { MarkdownLine } from "@/components/features/markdown-line";
import { Badge } from "@/components/ui/badge";
import { findQuotedLineIndexes } from "@/lib/evidence-match";
import type { EvidenceRef } from "@/types/api";

/**
 * Corps de la procédure : texte intégral avec le passage cité surligné et amené au
 * centre de la vue. Extrait de `ProcedureEvidenceDialog` (2026-09-11) pour être
 * réutilisé tel quel par la page « ouvrir dans un nouvel onglet »
 * (`/procedures/[id]`, Phase 6 § 5) — même logique de surlignage, pas de duplication.
 */
export function ProcedureBody({
  text,
  excerpt,
  language,
}: {
  text: string;
  excerpt: string;
  language: EvidenceRef["language"];
}) {
  const t = useTranslations("procedureDialog");
  const quotedIndexes = findQuotedLineIndexes(text, excerpt);
  const firstQuotedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    firstQuotedRef.current?.scrollIntoView({ block: "center" });
  }, [text, excerpt]);

  const lines = text.split("\n");
  // Calculé avant le rendu : muter un compteur pendant `map` rend le résultat
  // dépendant de l'ordre de rendu.
  const firstQuotedIndex = quotedIndexes.size ? Math.min(...quotedIndexes) : -1;

  return (
    // `min-h-0` : sans ça, un enfant flex refuse de rétrécir sous sa taille de
    // contenu et le `div` à défilement ci-dessous ignorerait `flex-1`, débordant la fenêtre.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {quotedIndexes.size === 0 ? (
        <p className="text-xs text-muted-foreground print:hidden">{t("noHighlight")}</p>
      ) : null}

      {/* `overflow-y-auto` natif plutôt que `ScrollArea` (Radix) : dans ce dialogue
          comme dans `FindingDetailDialog`, le viewport interne de `ScrollArea` ne se
          limitait jamais à la hauteur donnée par flexbox (`height:100%` refusait de se
          résoudre ici, cause non identifiée avec certitude) et le contenu débordait
          sans défiler — un document plus long que la fenêtre restait coupé après sa
          première section, sans indication qu'il continuait. Un `div` à défilement
          natif n'a pas ce problème. */}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border p-4 print:h-auto print:overflow-visible print:border-none print:p-0"
        lang={language.toLowerCase()}
      >
        {lines.map((line, index) => {
          const isQuoted = quotedIndexes.has(index);

          if (!line.trim()) return <div key={index} className="h-2" />;

          return (
            <div
              // Les lignes du document n'ont pas d'identifiant stable : leur
              // position dans le texte est la seule clé disponible.
              key={index}
              ref={index === firstQuotedIndex ? firstQuotedRef : undefined}
              className={cn(
                "scroll-mt-4 text-sm leading-relaxed",
                // Teinte neutre : les couleurs de statut restent réservées à
                // `assessment` (docs/ui-guidelines.md).
                isQuoted &&
                  "rounded-md bg-foreground/8 px-3 py-2 font-medium ring-1 ring-foreground/20",
              )}
            >
              <MarkdownLine
                text={line}
                leading={
                  isQuoted ? (
                    <Badge variant="secondary" className="mr-2 align-middle text-[10px]">
                      {t("citedBadge")}
                    </Badge>
                  ) : null
                }
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground print:hidden">{t("sourceNote")}</p>
    </div>
  );
}
