"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { euDocumentUrl, fetchEuDocumentHtml } from "@/lib/api/eu-search";
import { queryKeys } from "@/lib/api/query-keys";
import type { EuSearchResult } from "@/types/api";

/**
 * Injecté en tête du HTML CELLAR : CSP qui bloque toute ressource externe (feuilles de
 * style et images relatives d'EUR-Lex, introuvables hors de leur site) + mise en page
 * lisible. Les classes `oj-*` sont celles du Journal officiel.
 */
const VIEWER_HEAD = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<style>
body{font:15px/1.6 system-ui,sans-serif;color:#1c1c1c;background:#fff;max-width:56rem;margin:0 auto;padding:1.5rem}
table{border-collapse:collapse;max-width:100%}td,th{vertical-align:top;padding:.2rem .4rem}
.oj-table td,.oj-table th{border:1px solid #d4d4d4}
.oj-doc-ti,.oj-ti-art,.oj-sti-art,.oj-ti-section-1,.oj-ti-section-2{text-align:center}
.oj-doc-ti,.oj-sti-art,.oj-ti-section-2,.oj-bold{font-weight:600}.oj-ti-art,.oj-italic{font-style:italic}
.oj-note{font-size:.85em}
</style>`;

/**
 * Lecture d'un acte européen dans l'application, avec téléchargement .docx — consultation
 * uniquement, aucune conclusion d'applicabilité (docs/ui-guardrails.md).
 */
export function EuDocumentDialog({
  result,
  onClose,
}: {
  result: EuSearchResult | null;
  onClose: () => void;
}) {
  const t = useTranslations("knowledgeBase.euSearch");
  const lang = useLocale() === "en" ? "en" : "fr";
  const celex = result?.celex ?? "";

  const documentQuery = useQuery({
    queryKey: queryKeys.euDocument(celex, lang),
    queryFn: () => fetchEuDocumentHtml(celex, lang),
    enabled: result !== null,
    staleTime: Infinity,
  });

  return (
    <Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-none flex-col overflow-hidden sm:max-w-none lg:w-[70vw]">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-sm">{result?.celex}</span>
            {/* Titre CELLAR tel quel : texte source, jamais traduit. */}
            <span className="line-clamp-2 leading-snug">{result?.title}</span>
          </DialogTitle>
          <DialogDescription>{t("documentNote")}</DialogDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            {documentQuery.isSuccess ? (
              <Button asChild size="sm">
                <a href={euDocumentUrl(celex, lang, "docx")} download>
                  <Download aria-hidden />
                  {t("downloadDocx")}
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <a href={result?.eurlexUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                {t("openOnEurLex")}
              </a>
            </Button>
          </div>
        </DialogHeader>

        {documentQuery.isPending ? (
          <LoadingState rows={8} />
        ) : documentQuery.isError ? (
          <ErrorState error={documentQuery.error} onRetry={() => void documentQuery.refetch()} />
        ) : (
          <iframe
            // Bac à sable total pour du HTML tiers : ni script, ni formulaire, ni popup.
            sandbox=""
            title={t("documentFrameTitle", { celex })}
            srcDoc={injectViewerHead(documentQuery.data)}
            className="min-h-0 w-full flex-1 rounded-md border bg-white"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function injectViewerHead(html: string) {
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (head) => head + VIEWER_HEAD)
    : VIEWER_HEAD + html;
}
