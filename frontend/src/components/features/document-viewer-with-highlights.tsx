import { highlightSegments } from "@/lib/evidence-match";
import type { EvidenceRef } from "@/types/api";

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
