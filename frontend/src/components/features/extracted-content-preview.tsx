"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { ExtractedChunk } from "@/lib/file-extract";
import type { FileExtractionStatus } from "@/lib/use-file-extraction";

const PREVIEW_CHAR_LIMIT = 600;

/**
 * Aperçu de l'extraction côté client (Thư, 2026-09-14) sur les dialogues d'upload —
 * seule façon de vérifier visuellement que l'extraction a marché tant qu'aucun écran
 * ne consomme encore ces chunks après l'upload (pas d'API réelle, voir
 * `lib/file-extract.ts`).
 */
export function ExtractedContentPreview({
  status,
  chunks,
  onRetry,
}: {
  status: FileExtractionStatus;
  chunks: readonly ExtractedChunk[];
  /** Relance l'extraction sur le même fichier, sans repasser par le sélecteur. */
  onRetry: () => void;
}) {
  const t = useTranslations("fileExtraction");

  if (status === "idle") return null;

  if (status === "extracting") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {t("extracting")}
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
        <span className="flex-1">{t("extractionFailed")}</span>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
  const preview = chunks
    .map((chunk) => `${chunk.section_title}\n${chunk.content}`)
    .join("\n\n")
    .slice(0, PREVIEW_CHAR_LIMIT);

  return (
    <div className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
      <p className="text-xs font-medium text-muted-foreground">
        {t("previewLabel", { count: chunks.length, chars: totalChars })}
      </p>
      {preview ? (
        <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
          {preview}
          {totalChars > PREVIEW_CHAR_LIMIT ? "…" : ""}
        </pre>
      ) : null}
    </div>
  );
}
