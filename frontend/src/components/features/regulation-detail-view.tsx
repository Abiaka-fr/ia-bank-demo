"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { AssigneeName } from "@/components/features/assignee-select";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { FindingsActionsTable } from "@/components/features/findings-actions-table";
import { MarkdownLine } from "@/components/features/markdown-line";
import { RegulationHistoryTab } from "@/components/features/regulation-history-tab";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { RegulationOverviewTab } from "@/components/features/regulation-overview-tab";
import { RequirementsTab } from "@/components/features/requirements-tab";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFindingsByRegulation } from "@/lib/api/findings";
import { ReviewProgressBar } from "@/components/features/review-progress";
import { useRegulationTab } from "@/lib/use-regulation-tab";
import { humanStatusValues } from "@/lib/assessment";
import { queryKeys } from "@/lib/api/query-keys";
import {
  fetchRegulation,
  fetchRegulationRequirements,
} from "@/lib/api/regulations";

export function RegulationDetailView({ regulationId }: { regulationId: string }) {
  const t = useTranslations("regulations");
  const common = useTranslations("common");
  const assigneeT = useTranslations("assignee");
  const actionsT = useTranslations("actions");
  const historyT = useTranslations("history");

  const regulationQuery = useQuery({
    queryKey: queryKeys.regulation(regulationId),
    queryFn: () => fetchRegulation(regulationId),
  });

  const requirementsQuery = useQuery({
    queryKey: queryKeys.regulationRequirements(regulationId),
    queryFn: () => fetchRegulationRequirements(regulationId),
  });

  const findingsQuery = useQuery({
    queryKey: queryKeys.findings(regulationId),
    queryFn: () => fetchFindingsByRegulation(regulationId),
  });

  // Le backend réel ne renseigne jamais `status: ANALYZED` (voir
  // docs/backend-integration.md — aucun champ d'avancement d'analyse côté serveur) :
  // se fier à la présence de vraies exigences plutôt qu'à ce champ pour décider si
  // l'onglet « Vue d'ensemble » a quelque chose à montrer.
  const hasAnalysisData = (requirementsQuery.data?.length ?? 0) > 0;
  const { tab, focus, setTab } = useRegulationTab(hasAnalysisData ? "overview" : "source");

  if (regulationQuery.isPending) return <LoadingState rows={5} />;
  if (regulationQuery.isError) {
    return (
      <ErrorState
        error={regulationQuery.error}
        onRetry={() => void regulationQuery.refetch()}
      />
    );
  }

  const regulation = regulationQuery.data;
  const requirements = requirementsQuery.data ?? [];
  const findings = findingsQuery.data ?? [];

  const reviewCounts = humanStatusValues.map((human_status) => ({
    human_status,
    count: findings.filter((finding) => finding.human_status === human_status)
      .length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={regulation.title}
        subtitle={`${regulation.authority_or_owner} · ${common("version")} ${regulation.version}`}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="font-mono text-[11px]">
          {regulation.document_id}
        </Badge>
        {/* Le badge de statut ne s'affiche que là où il n'y a encore rien à traiter :
            dès qu'il existe des constats, la barre de progression ci-dessous (même
            condition, `findings.length`) prend le relais. */}
        {findings.length === 0 ? <DocumentStatusBadge status={regulation.status} /> : null}
        {regulation.domain.map((domain) => (
          <Badge key={domain} variant="outline" className="text-[11px]">
            {domain}
          </Badge>
        ))}
        <span className="text-muted-foreground">
          {common("effectiveDate")} :{" "}
          {regulation.effective_date ?? common("notAvailable")}
        </span>
        <span className="text-muted-foreground">
          {assigneeT("label")} : <AssigneeName userId={regulation.assignee_id} />
        </span>
        <span className="text-muted-foreground">
          {t("uploadedBy")} : <AssigneeName userId={regulation.uploaded_by_id} />
        </span>
      </div>

      {findings.length ? (
        <ReviewProgressBar counts={reviewCounts} className="max-w-xl" />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="requirements">
            {t("requirementsHeading")} ({requirements.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            {actionsT("tabLabel")} ({findings.length})
          </TabsTrigger>
          <TabsTrigger value="source">{t("sourceText")}</TabsTrigger>
          <TabsTrigger value="history">{historyT("tabLabel")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {hasAnalysisData ? (
            <RegulationOverviewTab regulationId={regulationId} />
          ) : (
            <EmptyState message={t("requirementsEmpty")} />
          )}
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          {requirementsQuery.isPending ? (
            <LoadingState rows={3} />
          ) : requirements.length === 0 ? (
            <EmptyState message={t("requirementsEmpty")} />
          ) : (
            <RequirementsTab
              requirements={requirements}
              findings={findings}
              regulationId={regulationId}
            />
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          {findingsQuery.isPending ? (
            <LoadingState rows={4} />
          ) : findings.length === 0 ? (
            <EmptyState message={t("requirementsEmpty")} />
          ) : (
            <FindingsActionsTable
              findings={findings}
              requirements={requirements}
              regulationId={regulationId}
              focus={focus}
            />
          )}
        </TabsContent>

        <TabsContent value="source" className="mt-4">
          {regulation.extracted_text ? (
            <ScrollArea className="h-[calc(100svh-22rem)] min-h-80 rounded-lg border">
              <div
                lang={regulation.language.toLowerCase()}
                className="space-y-2 p-4 text-sm leading-relaxed"
              >
                {regulation.extracted_text.split("\n").map((line, index) => (
                  <MarkdownLine key={index} text={line} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <EmptyState message={t("noExtractedText")} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RegulationHistoryTab regulationId={regulationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
