"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { AssigneeName } from "@/components/features/assignee-select";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { FindingsActionsTable } from "@/components/features/findings-actions-table";
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
  const isAnalyzed = regulation.status === "ANALYZED";

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
        <DocumentStatusBadge status={regulation.status} />
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

      <Tabs defaultValue={isAnalyzed ? "overview" : "source"}>
        <TabsList>
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="requirements">
            {t("requirementsHeading")} ({requirements.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            {actionsT("tabLabel")} ({findings.length})
          </TabsTrigger>
          <TabsTrigger value="source">{t("sourceText")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {isAnalyzed ? (
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
            <RequirementsTab requirements={requirements} findings={findings} />
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
            />
          )}
        </TabsContent>

        <TabsContent value="source" className="mt-4">
          {regulation.extracted_text ? (
            <ScrollArea className="h-[32rem] rounded-lg border">
              <pre
                lang={regulation.language.toLowerCase()}
                className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed"
              >
                {regulation.extracted_text}
              </pre>
            </ScrollArea>
          ) : (
            <EmptyState message={t("noExtractedText")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
