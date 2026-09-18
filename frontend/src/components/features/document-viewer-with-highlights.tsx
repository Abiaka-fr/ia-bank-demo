"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ErrorState, LoadingState } from "@/components/features/query-state";
import { fetchDocumentContent } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/query-keys";
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
  const highlightedContent = highlightEvidence(content, evidence);
  const isEmpty = typeof highlightedContent === "string" && highlightedContent.length === 0;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card p-4">
        <div className="max-h-80 overflow-y-auto text-sm leading-relaxed">
          {!isEmpty ? (
            <div className="whitespace-pre-wrap">{highlightedContent}</div>
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
 * Highlight evidence excerpts in the document content.
 * Returns JSX elements with highlighted sections.
 */
function highlightEvidence(
  content: string,
  evidence: readonly EvidenceRef[],
): React.ReactNode {
  if (!content || evidence.length === 0) return content;

  // Create a map of excerpts to their evidence
  const excerptMap = new Map<string, EvidenceRef>();
  evidence.forEach((ref) => {
    if (ref.excerpt && ref.excerpt.trim()) {
      excerptMap.set(ref.excerpt.trim().toLowerCase(), ref);
    }
  });

  if (excerptMap.size === 0) return content;

  // Split content and highlight matching excerpts
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort excerpts by length (longest first) to avoid partial matches
  const sortedExcerpts = Array.from(excerptMap.keys()).sort(
    (a, b) => b.length - a.length,
  );

  const contentLower = content.toLowerCase();
  const replacements: Array<{ start: number; end: number; excerpt: string }> =
    [];

  // Find all occurrences of evidence
  sortedExcerpts.forEach((excerpt) => {
    let index = 0;
    while ((index = contentLower.indexOf(excerpt, index)) !== -1) {
      // Check if this position overlaps with existing replacements
      const overlaps = replacements.some(
        (r) => (index < r.end && index + excerpt.length > r.start),
      );
      if (!overlaps) {
        replacements.push({
          start: index,
          end: index + excerpt.length,
          excerpt,
        });
      }
      index += 1;
    }
  });

  // Sort replacements by start position
  replacements.sort((a, b) => a.start - b.start);

  // Build the result with highlights
  replacements.forEach((replacement) => {
    if (lastIndex < replacement.start) {
      parts.push(content.substring(lastIndex, replacement.start));
    }
    parts.push(
      <mark
        key={`${replacement.start}-${replacement.end}`}
        className="rounded bg-yellow-200 px-0.5 font-medium text-gray-900"
      >
        {content.substring(replacement.start, replacement.end)}
      </mark>,
    );
    lastIndex = replacement.end;
  });

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts;
}
