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
import { fetchRegulationHistory } from "@/lib/api/history";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Onglet « Historique » : qui a pris quelle décision, sur quelle exigence, quand.
 * `PENDING` n'y apparaît jamais — ce n'est pas une décision (voir `lib/mocks/store.ts`).
 */
export function RegulationHistoryTab({ regulationId }: { regulationId: string }) {
  const t = useTranslations("history");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.regulationHistory(regulationId),
    queryFn: () => fetchRegulationHistory(regulationId),
  });

  if (isPending) return <LoadingState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState message={t("empty")} />;

  return (
    <div className="rounded-lg border">
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
          {data.map((entry) => (
            <TableRow key={entry.entry_id}>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {entry.created_at.slice(0, 16).replace("T", " ")}
              </TableCell>
              <TableCell className="text-sm">
                <AssigneeName userId={entry.actor_id} />
              </TableCell>
              <TableCell>
                <HumanStatusBadge status={entry.action} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {entry.requirement_id}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {entry.procedure_id ?? "—"}
              </TableCell>
              <TableCell className="whitespace-normal text-sm text-muted-foreground">
                {entry.custom_action || entry.reviewer_comment || t("noComment")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
