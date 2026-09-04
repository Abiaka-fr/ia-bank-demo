"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ListChecks,
  ScrollText,
  UserSearch,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AssessmentChart } from "@/components/features/assessment-chart";
import { AssigneeName } from "@/components/features/assignee-select";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { DomainChart } from "@/components/features/domain-chart";
import { KpiCard } from "@/components/features/kpi-card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { fetchPortfolioSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

/** Écran d'accueil (v1.1) : agrégats sur toutes les régulations, pas une seule. */
export function PortfolioDashboardView() {
  const t = useTranslations("dashboard");
  const regulationsT = useTranslations("regulations");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: fetchPortfolioSummary,
  });

  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const kpis = [
    { label: t("kpi.regulations"), value: data.regulations_total, icon: ScrollText },
    {
      label: t("kpi.requirementsIdentified"),
      value: data.requirements_identified,
      icon: ListChecks,
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("byRegulation")}</h2>
        {data.by_regulation.length === 0 ? (
          <EmptyState message={regulationsT("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%] min-w-[16rem]">
                    {t("columnRegulation")}
                  </TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnAssignee")}</TableHead>
                  <TableHead className="text-right">
                    {t("kpi.requirementsIdentified")}
                  </TableHead>
                  <TableHead className="text-right">{t("kpi.potentialGaps")}</TableHead>
                  <TableHead className="text-right">
                    {t("kpi.expertReviewsRequired")}
                  </TableHead>
                  <TableHead className="text-right">{t("columnProgress")}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_regulation.map((row) => (
                  <TableRow key={row.regulation_id}>
                    <TableCell className="whitespace-normal py-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.regulation_id}
                      </span>
                      <p className="text-sm font-medium">{row.title}</p>
                    </TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <AssigneeName userId={row.assignee_id} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.requirements_identified}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.potential_gaps}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.expert_reviews_required}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.actions_total - row.actions_pending} / {row.actions_total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/regulations/${row.regulation_id}`}>
                          <ChevronRight aria-hidden />
                          <span className="sr-only">{regulationsT("detailHeading")}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

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
