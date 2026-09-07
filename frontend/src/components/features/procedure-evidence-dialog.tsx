"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { MarkdownLine } from "@/components/features/markdown-line";
import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchProcedure } from "@/lib/api/procedures";
import { findQuotedLineIndexes } from "@/lib/evidence-match";
import type { EvidenceRef } from "@/types/api";

/**
 * Affiche la procédure interne complète et surligne le passage cité par la preuve,
 * en y faisant défiler la vue — pour lire la citation dans son contexte.
 */
export function ProcedureEvidenceDialog({
  evidence,
  isOpen,
  onOpenChange,
}: {
  evidence: EvidenceRef;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("procedureDialog");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.procedure(evidence.document_id),
    queryFn: () => fetchProcedure(evidence.document_id),
    // Inutile de charger le document tant que la fenêtre n'est pas ouverte.
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // ~60 % de l'écran dans les deux dimensions (demande explicite) : la fenêtre
        // précédente (max-w-3xl, hauteur figée à 26rem) était trop étroite pour lire
        // un document entier confortablement. Bornée par le viewport pour rester
        // utilisable sur un petit écran (`max-h-[90vh]` en repli). `overflow-hidden` :
        // sans lui, un document plus haut que 90 % de l'écran déborde visuellement
        // hors de la carte au lieu d'être contenu par le défilement interne du corps.
        className="flex max-h-[90vh] w-[60vw] max-w-none flex-col overflow-hidden sm:max-w-none"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{evidence.document_id}</span>
            <span>{data?.title ?? evidence.document_title}</span>
          </DialogTitle>
          <DialogDescription>
            {t("citedSection", { section: evidence.section_reference })}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <LoadingState rows={5} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <ProcedureBody text={data.extracted_text} excerpt={evidence.excerpt} language={data.language} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProcedureBody({
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
    // contenu et le ScrollArea ci-dessous ignorerait `flex-1`, débordant la fenêtre.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {quotedIndexes.size === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noHighlight")}</p>
      ) : null}

      {/* `overflow-hidden` en plus de `min-h-0 flex-1` : sans lui, le viewport interne
          du ScrollArea (Radix) ne se limite pas toujours strictement à la hauteur que
          lui donne flexbox dans un conteneur imbriqué, et le texte déborde visuellement
          sous la bordure au lieu d'être coupé et défilable. */}
      <ScrollArea className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        <div className="space-y-2 p-4" lang={language.toLowerCase()}>
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
      </ScrollArea>

      <p className="text-[11px] text-muted-foreground">{t("sourceNote")}</p>
    </div>
  );
}
