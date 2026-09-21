"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { HighlightedText } from "@/components/features/document-viewer-with-highlights";
import { ErrorState, LoadingState } from "@/components/features/query-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchRegulation } from "@/lib/api/regulations";
import type { DocumentMeta, EvidenceRef } from "@/types/api";

/**
 * Lazy-loaded dialog for viewing the full regulation document.
 * Mirrors ProcedureEvidenceDialog pattern exactly.
 */
export function RegulationDocumentDialog({
  document,
  evidence,
  isOpen,
  onOpenChange,
}: {
  document: DocumentMeta;
  evidence: EvidenceRef[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("procedureDialog");
  const common = useTranslations("common");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.regulation(document.document_id),
    queryFn: () => fetchRegulation(document.document_id),
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[60vw] max-w-none flex-col overflow-hidden sm:max-w-none">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{document.document_id}</span>
            <span>{data?.title ?? document.title}</span>
          </DialogTitle>
          <DialogDescription>
            {document.authority_or_owner}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <LoadingState rows={5} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <HighlightedText content={data.extracted_text} evidence={evidence} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">{common("notAvailable")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
