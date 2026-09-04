"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { EvidenceRef } from "@/types/api";

/**
 * Toute preuve affichée montre sa source (document + section) : jamais un extrait
 * "nu" (`docs/ui-guidelines.md`, principe de traçabilité).
 *
 * L'extrait n'est jamais traduit — il reste dans sa langue d'origine.
 */
export function EvidenceCard({ evidence }: { evidence: EvidenceRef }) {
  const t = useTranslations("evidence");

  return (
    <figure className="rounded-lg border bg-card p-4">
      <figcaption className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">{evidence.document_id}</span>
        <span className="text-muted-foreground">{evidence.document_title}</span>
        <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
          {evidence.section_reference}
        </Badge>
      </figcaption>
      <blockquote
        lang={evidence.language.toLowerCase()}
        className="border-l-2 pl-3 text-sm leading-relaxed text-foreground/90"
      >
        {evidence.excerpt}
      </blockquote>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("sourceLanguageNote", { language: evidence.language })}
      </p>
    </figure>
  );
}
