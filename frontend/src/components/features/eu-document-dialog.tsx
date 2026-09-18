"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
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
 * « page du Journal officiel » aux couleurs de l'app (docs/ui-guidelines.md, hex en dur :
 * les variables CSS de l'app n'atteignent pas l'iframe). Les classes `oj-*` sont celles
 * du Journal officiel ; `#banner` est le bandeau EUR-Lex des anciens textes non-XHTML.
 */
const VIEWER_HEAD = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<style>
html{background:#eef1f5}
body{box-sizing:border-box;max-width:56rem;margin:1.5rem auto;padding:3rem 4rem;background:#fff;border:1px solid #dbe1ea;border-radius:4px;box-shadow:0 1px 3px rgb(11 31 58/.08);color:#182338;font:16px/1.65 Charter,Cambria,"Sitka Text",Georgia,serif;font-variant-numeric:lining-nums;overflow-wrap:break-word;text-wrap:pretty}
@media (max-width:48rem){body{margin:0;padding:1.25rem;border:0;border-radius:0}}
p{margin:.6em 0}
a{color:#16345c;text-decoration-color:rgb(22 52 92/.3);text-decoration-thickness:1px;text-underline-offset:2px}a:hover{text-decoration-color:#b8863f}
img:not([src^="data:"]),#banner{display:none}
hr{border:0;border-top:1px solid #dbe1ea;margin:1.5em 0}
hr.oj-separator,hr.oj-doc-sep{border-top:2px solid #0b1f3a;margin:.75em 0}hr.oj-doc-sep{margin:3em 0}
table{border-collapse:collapse;max-width:100%}td,th{vertical-align:top;padding:0}
td>p:first-child{margin-top:0}td>p:last-child{margin-bottom:0}
table:not(.oj-table){margin:.6em 0}table:not(.oj-table) td:first-child{width:1.75em;white-space:nowrap;padding-right:.75em}
[class^="oj-hd-"]{margin:0;font:13px/1.45 system-ui,sans-serif;color:#5a6a85}.oj-hd-ti{font-weight:600;color:#0b1f3a}
table:has([class^="oj-hd-"]),table:has([class^="oj-hd-"]) tbody{display:block;margin:.4em 0}table:has([class^="oj-hd-"]) tr{display:flex;justify-content:space-between;gap:1em}
table:has([class^="oj-hd-"]) td{width:auto}table:has([class^="oj-hd-"]) td:has(>img){display:none}table:has([class^="oj-hd-"]) td:last-child{text-align:right}
.eli-main-title{margin:2.5em 0 2em}
.oj-doc-ti{margin:.3em 0;text-align:center;font-weight:600}.eli-main-title .oj-doc-ti:first-child{font-size:1.3em;color:#0b1f3a}
.oj-ti-section-1{margin:2.5em 0 .2em;text-align:center;font-size:.8em;letter-spacing:.12em;text-transform:uppercase;color:#5a6a85}
.oj-ti-section-2{margin:0 0 1em;text-align:center;font-size:1.1em;font-weight:600;color:#0b1f3a}
.oj-ti-art{margin:2em 0 .1em;text-align:center;font-style:italic}.oj-sti-art{margin:0 0 .75em;text-align:center;font-weight:600}
.oj-ti-grseq-1,.oj-ti-tbl,.oj-bold{font-weight:600}.oj-italic{font-style:italic}.oj-expanded{letter-spacing:.08em}
.oj-super,a:has(>.oj-note-tag){font-size:.72em;line-height:0;vertical-align:super}a:has(>.oj-note-tag){text-decoration:none}
.oj-note-tag,.oj-note .oj-super{font-size:inherit;vertical-align:baseline}
table.oj-table{width:100%;margin:1em 0;font-size:.9em;line-height:1.45}
td.oj-table,th.oj-table{border:1px solid #dbe1ea;padding:.45em .65em}td.oj-table:has(.oj-tbl-hdr){background:#eef1f5}
.oj-tbl-txt,.oj-tbl-hdr{margin:.15em 0}.oj-tbl-hdr{font-weight:600}
hr.oj-note{width:8rem;margin:2.5em 0 1em}p.oj-note{margin:.4em 0;font-size:.85em;line-height:1.5;color:#3f4d66}
.oj-final{margin-top:2em}div.oj-signatory{margin-top:1.5em}p.oj-signatory{margin:.1em 0}
body>p.oj-normal{margin:.2em 0;font:12px/1.4 system-ui,sans-serif;color:#5a6a85}
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
          <DialogTitle className="flex items-start gap-2 text-lg leading-snug">
            <Badge variant="outline" className="mt-1 shrink-0 font-mono">
              {result?.celex}
            </Badge>
            {/* Titre CELLAR tel quel : texte source, jamais traduit. */}
            <span className="line-clamp-2">{result?.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">{t("documentNote")}</DialogDescription>
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
            className="min-h-0 w-full flex-1 rounded-lg border bg-background"
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
