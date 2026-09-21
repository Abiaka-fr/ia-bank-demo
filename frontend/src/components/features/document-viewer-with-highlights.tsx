"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ErrorState, LoadingState } from "@/components/features/query-state";
import { fetchDocumentContent } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/query-keys";
import { highlightSegments } from "@/lib/evidence-match";
import type { EvidenceRef } from "@/types/api";

/**
 * Display full document content with highlighted evidence excerpts.
 * Searches for evidence text in the full document and marks it with highlights.
 */
export function DocumentViewerWithHighlights({
  documentId,
  evidence,
}: {
  documentId: string;
  evidence: readonly EvidenceRef[];
}) {
  const common = useTranslations("common");

  const contentQuery = useQuery({
    queryKey: queryKeys.documentContent(documentId),
    queryFn: () => fetchDocumentContent(documentId),
  });

  if (contentQuery.isPending) return <LoadingState rows={3} />;
  if (contentQuery.isError) {
    return (
      <ErrorState
        error={contentQuery.error}
        onRetry={() => void contentQuery.refetch()}
      />
    );
  }

  const content = contentQuery.data?.extracted_text || "";
  const isEmpty = !content;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card p-4">
        <div className="max-h-80 overflow-y-auto text-sm leading-relaxed">
          {!isEmpty ? (
            <HighlightedText content={content} evidence={evidence} />
          ) : (
            <p className="text-muted-foreground">{common("notAvailable")}</p>
          )}
        </div>
      </div>
      {evidence.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="size-2 rounded-full bg-yellow-400" />
            <span>Evidence highlights</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pure rendering component for highlighted text with evidence excerpts.
 * Takes content and evidence, no fetching or state management.
 */
export function HighlightedText({
  content,
  evidence,
}: {
  content: string;
  evidence: readonly EvidenceRef[];
}) {
  const segments = highlightSegments(content, evidence);

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark
            key={index}
            className="rounded bg-yellow-200 px-0.5 font-medium text-gray-900"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}
