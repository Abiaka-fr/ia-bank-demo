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
import { useState } from "react";

import { AssessmentChart } from "@/components/features/assessment-chart";
import { AssigneeName } from "@/components/features/assignee-select";
import { AwaitingBackendBadge } from "@/components/features/awaiting-backend-badge";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { DomainChart } from "@/components/features/domain-chart";
import { KpiCard } from "@/components/features/kpi-card";
import { PaginationControls } from "@/components/features/pagination-controls";
import {
  MindmapLegend,
  RegulationMindmap,
} from "@/components/features/regulation-mindmap";
import { ReviewProgressBar } from "@/components/features/review-progress";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/i18n/navigation";
import { fetchPortfolioSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";
import { isRegulationFullyHandled } from "@/lib/mocks/summary";

/** Régulations par page dans « Détail par régulation » (demande explicite). */
const REGULATIONS_PER_PAGE = 5;

/** Écran d'accueil (v1.1) : agrégats sur toutes les régulations, pas une seule. */
export function PortfolioDashboardView() {
  const t = useTranslations("dashboard");
  const mindmapT = useTranslations("mindmap");
  // Réutilise le libellé déjà traduit de l'écran « Analyse réglementaire » plutôt que
  // de dupliquer la clé (Phase 6 § 2, résumé document).
  const regulationsT = useTranslations("regulations");
  const router = useRouter();
  const [page, setPage] = useState(1);

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

  // Une régulation entièrement traitée n'a plus rien à réclamer l'attention du
  // Responsable Conformité sur cet écran — elle reste consultable depuis « Analyse
  // réglementaire », juste plus listée ici (demande explicite).
  const outstanding = data.by_regulation.filter(
    (row) => !isRegulationFullyHandled(row),
  );
  const pageCount = Math.max(1, Math.ceil(outstanding.length / REGULATIONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = outstanding.slice(
    (currentPage - 1) * REGULATIONS_PER_PAGE,
    currentPage * REGULATIONS_PER_PAGE,
  );

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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("byRegulation")}</h2>
        {outstanding.length === 0 ? (
          <EmptyState message={t("byRegulationAllHandled")} />
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[34%] min-w-[16rem]">
                      {t("columnRegulation")}
                    </TableHead>
                    <TableHead className="min-w-[12rem]">
                      {t("columnProgress")}
                    </TableHead>
                    <TableHead>{t("columnAssignee")}</TableHead>
                    <TableHead className="text-right">
                      {t("kpi.requirementsIdentified")}
                    </TableHead>
                    <TableHead className="text-right">{t("kpi.potentialGaps")}</TableHead>
                    <TableHead className="text-right">
                      {t("kpi.expertReviewsRequired")}
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow
                      key={row.regulation_id}
                      tabIndex={0}
                      role="link"
                      aria-label={row.title}
                      onClick={() => router.push(`/regulations/${row.regulation_id}`)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        router.push(`/regulations/${row.regulation_id}`);
                      }}
                      className="cursor-pointer focus-visible:bg-accent/40 focus-visible:outline-none"
                    >
                      <TableCell className="whitespace-normal py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.regulation_id}
                        </span>
                        <p className="text-sm font-medium">{row.title}</p>
                        {/* Résumé court demandé par Francis (§2, phase-6) — même
                            emplacement/donnée en attente que sur `regulations-view.tsx`,
                            `RegulationSummary` n'a pas plus de champ résumé que
                            `DocumentMeta`. */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{regulationsT("summaryLabel")} :</span>
                          <AwaitingBackendBadge field="DocumentMeta.summary" />
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {row.actions_total === 0 ? (
                          <DocumentStatusBadge status={row.status} />
                        ) : (
                          <ReviewProgressBar
                            counts={row.by_human_status}
                            showBreakdown={false}
                          />
                        )}
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
                      <TableCell className="text-right">
                        <ChevronRight
                          className="ml-auto size-4 text-muted-foreground"
                          aria-hidden
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{mindmapT("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{mindmapT("subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <RegulationMindmap />
          <MindmapLegend />
        </CardContent>
      </Card>
    </div>
  );
}
