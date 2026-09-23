"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { AssigneeName } from "@/components/features/assignee-select";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchRegulationHistory, fetchMappingHistoryById } from "@/lib/api/history";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Onglet « Historique » : qui a pris quelle décision, sur quel couple, quand.
 * `PENDING` n'y apparaît jamais — ce n'est pas une décision.
 * `mappingId` restreint à un couple spécifique (page d'un constat).
 */
export function RegulationHistoryTab({
  regulationId,
  mappingId,
  requirementId,
}: {
  regulationId?: string;
  mappingId?: string;
  requirementId?: string;
}) {
  const t = useTranslations("history");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: mappingId
      ? queryKeys.mappingHistory(mappingId)
      : queryKeys.regulationHistory(regulationId || ""),
    queryFn: () =>
      mappingId
        ? fetchMappingHistoryById(mappingId)
        : fetchRegulationHistory(regulationId || ""),
    enabled: !!mappingId || !!regulationId,
  });

  if (isPending) return <LoadingState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const entries =
    !mappingId && requirementId ? data.filter((entry) => entry.requirement_id === requirementId) : data;
  if (entries.length === 0) return <EmptyState message={t("empty")} />;

  return (
    <div className="rounded-lg border bg-card shadow-sm shadow-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[10rem]">{t("columnDate")}</TableHead>
            <TableHead>{t("columnActor")}</TableHead>
            <TableHead>{t("columnAction")}</TableHead>
            <TableHead>{t("columnRequirement")}</TableHead>
            <TableHead>{t("columnProcedure")}</TableHead>
            <TableHead className="min-w-[16rem]">{t("columnComment")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.entry_id}>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {entry.created_at.slice(0, 16).replace("T", " ")}
              </TableCell>
              <TableCell className="text-sm">
                <AssigneeName userId={entry.actor_id} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.previous_status && entry.previous_status !== entry.action ? (
                    <>
                      <HumanStatusBadge status={entry.previous_status} />
                      <span aria-hidden>→</span>
                    </>
                  ) : null}
                  <HumanStatusBadge status={entry.action} />
                </div>
                {entry.assignee_id ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("assignedTo")} <AssigneeName userId={entry.assignee_id} />
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {entry.requirement_id}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {entry.procedure_id ?? "—"}
                <span className="block text-[11px]">{entry.finding_id}</span>
              </TableCell>
              <TableCell className="whitespace-normal text-sm text-muted-foreground">
                {entry.custom_action || entry.reviewer_comment || t("noComment")}
                {entry.new_version_id ? (
                  <span className="mt-1 block font-mono text-xs">
                    {t("newVersion", { version: entry.new_version_id })}
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
