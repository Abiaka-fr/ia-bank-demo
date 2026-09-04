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
import { KpiCard } from "@/components/features/kpi-card";
import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

/** Onglet « Vue d'ensemble » — les KPI d'UNE régulation (ancien écran Dashboard). */
export function RegulationOverviewTab({ regulationId }: { regulationId: string }) {
  const t = useTranslations("dashboard");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboardSummary(regulationId),
    queryFn: () => fetchDashboardSummary(regulationId),
  });

  if (isPending) return <LoadingState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const kpis = [
    {
      label: t("kpi.requirementsIdentified"),
      value: data.requirements_identified,
      icon: ListChecks,
    },
    {
      label: t("kpi.proceduresImpacted"),
      value: data.procedures_impacted,
      icon: FileStack,
    },
    { label: t("kpi.potentialGaps"), value: data.potential_gaps, icon: CircleAlert },
    {
      label: t("kpi.expertReviewsRequired"),
      value: data.expert_reviews_required,
      icon: UserSearch,
    },
    {
      label: t("kpi.actionsPending"),
      value: data.actions_pending,
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
            <DomainChart data={data.by_domain} label={t("byDomain")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byAssessment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentChart data={data.by_assessment} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
