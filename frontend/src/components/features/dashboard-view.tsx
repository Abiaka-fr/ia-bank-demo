"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  ClipboardCheck,
  FileStack,
  ListChecks,
  UserSearch,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AssessmentChart } from "@/components/features/assessment-chart";
import { DomainChart } from "@/components/features/domain-chart";
import { FindingsTable } from "@/components/features/findings-table";
import { KpiCard } from "@/components/features/kpi-card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchRegulationRequirements } from "@/lib/api/regulations";

export function DashboardView() {
  const t = useTranslations("dashboard");
  const impact = useTranslations("impact");
  const { selectedRegulationId } = useSelectedRegulation();

  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboardSummary(selectedRegulationId ?? undefined),
    queryFn: () => fetchDashboardSummary(selectedRegulationId!),
    enabled: Boolean(selectedRegulationId),
  });

  const requirementsQuery = useQuery({
    queryKey: queryKeys.regulationRequirements(selectedRegulationId ?? ""),
    queryFn: () => fetchRegulationRequirements(selectedRegulationId!),
    enabled: Boolean(selectedRegulationId),
  });

  if (!selectedRegulationId) {
    return <EmptyState message={impact("emptyNoRegulation")} />;
  }
  if (summaryQuery.isPending || requirementsQuery.isPending) {
    return <LoadingState rows={5} />;
  }
  if (summaryQuery.isError) {
    return (
      <ErrorState
        error={summaryQuery.error}
        onRetry={() => void summaryQuery.refetch()}
      />
    );
  }

  const summary = summaryQuery.data;
  const requirementsById = new Map(
    (requirementsQuery.data ?? []).map((requirement) => [
      requirement.requirement_id,
      requirement,
    ]),
  );

  const kpis = [
    {
      label: t("kpi.requirementsIdentified"),
      value: summary.requirements_identified,
      icon: ListChecks,
    },
    {
      label: t("kpi.proceduresImpacted"),
      value: summary.procedures_impacted,
      icon: FileStack,
    },
    { label: t("kpi.potentialGaps"), value: summary.potential_gaps, icon: CircleAlert },
    {
      label: t("kpi.expertReviewsRequired"),
      value: summary.expert_reviews_required,
      icon: UserSearch,
    },
    {
      label: t("kpi.actionsPending"),
      value: summary.actions_pending,
      icon: ClipboardCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byDomain")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DomainChart data={summary.by_domain} label={t("byDomain")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byAssessment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentChart data={summary.by_assessment} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("topPriority")}</h2>
        {summary.top_priority_findings.length ? (
          <FindingsTable
            findings={summary.top_priority_findings}
            requirementsById={requirementsById}
          />
        ) : (
          <EmptyState message={t("topPriorityEmpty")} />
        )}
      </section>
    </div>
  );
}
