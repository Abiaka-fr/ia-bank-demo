"use client";

import { cn } from "cn";
import { ExternalLink, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { MarkdownLine } from "@/components/features/markdown-line";
import { ProcedureEvidenceDialog } from "@/components/features/procedure-evidence-dialog";
import { Badge } from "@/components/ui/badge";
import type { EvidenceRef } from "@/types/api";

/**
 * Toute preuve affichée montre sa source (document + section) : jamais un extrait
 * "nu" (`docs/ui-guidelines.md`, principe de traçabilité).
 *
 * L'extrait n'est jamais traduit — il reste dans sa langue d'origine.
 *
 * `openable` rend la carte cliquable : elle ouvre alors la procédure interne
 * complète, positionnée sur le passage cité.
 */
export function EvidenceCard({
  evidence,
  openable = false,
}: {
  evidence: EvidenceRef;
  openable?: boolean;
}) {
  const t = useTranslations("evidence");
  const dialogT = useTranslations("procedureDialog");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const content = (
    <>
      <figcaption className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">{evidence.document_id}</span>
        <span className="text-muted-foreground">{evidence.document_title}</span>
        <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
          {evidence.section_reference}
        </Badge>
        {openable ? (
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </figcaption>
      <blockquote
        lang={evidence.language.toLowerCase()}
        className="space-y-1 border-l-2 pl-3 text-sm leading-relaxed text-foreground/90"
      >
        {evidence.excerpt.split("\n").map((line, index) => (
          <MarkdownLine key={index} text={line} />
        ))}
      </blockquote>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("sourceLanguageNote", { language: evidence.language })}
        {openable ? ` · ${dialogT("openHint")}` : null}
      </p>
    </>
  );

  if (!openable) {
    return <figure className="rounded-lg border bg-card p-4">{content}</figure>;
  }

  return (
    <>
      <figure
        className={cn(
          "rounded-lg border bg-card transition-colors",
          "focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30 hover:bg-accent/40",
        )}
      >
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          aria-label={dialogT("openLabel", {
            document: evidence.document_id,
            section: evidence.section_reference,
          })}
          className="w-full cursor-pointer p-4 text-left focus:outline-none"
        >
          {content}
        </button>
      </figure>

      <ProcedureEvidenceDialog
        evidence={evidence}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
