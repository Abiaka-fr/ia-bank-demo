"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, UserRoundCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AssigneeName, AssigneeSelect } from "@/components/features/assignee-select";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { ReviewProgressBar } from "@/components/features/review-progress";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { fetchPortfolioSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";
import {
  fetchRegulations,
  updateRegulationAssignee,
} from "@/lib/api/regulations";
import type { RegulationSummary } from "@/types/api";

export function RegulationsView() {
  const t = useTranslations("regulations");
  const common = useTranslations("common");
  const assigneeT = useTranslations("assignee");
  const queryClient = useQueryClient();

  const regulationsQuery = useQuery({
    queryKey: queryKeys.regulations(),
    queryFn: fetchRegulations,
  });

  // Les compteurs des cartes viennent du même agrégat que le dashboard : une seule
  // requête plutôt qu'un `summary` par carte.
  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: fetchPortfolioSummary,
  });

  const assignMutation = useMutation({
    mutationFn: (input: { regulationId: string; assigneeId: string }) =>
      updateRegulationAssignee(input.regulationId, input.assigneeId),
    onSuccess: async () => {
      toast.success(assigneeT("updated"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.regulations() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary() });
    },
    onError: () => toast.error(assigneeT("updateFailed")),
  });

  if (regulationsQuery.isPending) return <LoadingState rows={3} />;
  if (regulationsQuery.isError) {
    return (
      <ErrorState
        error={regulationsQuery.error}
        onRetry={() => void regulationsQuery.refetch()}
      />
    );
  }
  if (!regulationsQuery.data.length) return <EmptyState message={t("empty")} />;

  const summaryByRegulation = new Map<string, RegulationSummary>(
    (summaryQuery.data?.by_regulation ?? []).map((row) => [row.regulation_id, row]),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {regulationsQuery.data.map((regulation) => {
        const summary = summaryByRegulation.get(regulation.document_id);
        const escalatedAssigneeIds = summary?.escalated_assignee_ids ?? [];
        const hasReview = (summary?.actions_total ?? 0) > 0;

        return (
          <Card
            key={regulation.document_id}
            className="relative flex flex-col transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30"
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {regulation.document_id}
                </Badge>
                {!hasReview ? (
                  <DocumentStatusBadge status={regulation.status} />
                ) : null}
                <ChevronRight
                  className="ml-auto size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base leading-snug">
                <Link
                  href={`/regulations/${regulation.document_id}`}
                  className="after:absolute after:inset-0 after:rounded-xl hover:underline focus:outline-none"
                >
                  {regulation.title}
                </Link>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("authority")}</dt>
                  <dd>{regulation.authority_or_owner}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {common("effectiveDate")}
                  </dt>
                  <dd>{regulation.effective_date ?? common("notAvailable")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("uploadedBy")}
                  </dt>
                  <dd>
                    <AssigneeName userId={regulation.uploaded_by_id} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("uploadedAtLabel")}
                  </dt>
                  <dd>{regulation.uploaded_at?.slice(0, 10) ?? common("notAvailable")}</dd>
                </div>
              </dl>

              {hasReview && summary ? (
                <ReviewProgressBar counts={summary.by_human_status} />
              ) : null}

              {regulation.domain.length ? (
                <div className="flex flex-wrap gap-1">
                  {regulation.domain.map((domain) => (
                    <Badge key={domain} variant="outline" className="text-[11px]">
                      {domain}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="relative z-10 space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRoundCheck className="size-3.5" aria-hidden />
                  {assigneeT("label")}
                </p>
                {/* Modifiable directement sur la carte : l'assignation faite à
                    l'upload n'est pas définitive. */}
                <AssigneeSelect
                  value={regulation.assignee_id}
                  disabled={assignMutation.isPending}
                  onChange={(assigneeId) =>
                    assignMutation.mutate({
                      regulationId: regulation.document_id,
                      assigneeId,
                    })
                  }
                  className="w-full"
                />
              </div>

              {escalatedAssigneeIds.length ? (
                <div className="space-y-1 rounded-md border border-dashed p-2">
                  <p className="text-xs text-muted-foreground">
                    {assigneeT("escalatedTo")}
                  </p>
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {escalatedAssigneeIds.map((userId) => (
                      <li key={userId}>
                        <Badge variant="outline" className="text-[11px]">
                          <AssigneeName userId={userId} />
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-auto pt-1 text-xs text-muted-foreground">
                {t("openCardHint")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
