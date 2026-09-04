"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { queryKeys } from "@/lib/api/query-keys";
import {
  fetchRegulation,
  fetchRegulationRequirements,
} from "@/lib/api/regulations";
import { fetchFindingsByRegulation } from "@/lib/api/findings";
import { PageHeader } from "@/components/layout/page-header";

/** Détail d'une régulation : métadonnées, exigences extraites, texte source. */
export function RegulationDetailView({ regulationId }: { regulationId: string }) {
  const t = useTranslations("regulations");
  const common = useTranslations("common");
  const { selectedRegulationId, selectRegulation } = useSelectedRegulation();

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

  if (regulationQuery.isPending || requirementsQuery.isPending) {
    return <LoadingState rows={5} />;
  }
  if (regulationQuery.isError) {
    return (
      <ErrorState
        error={regulationQuery.error}
        onRetry={() => void regulationQuery.refetch()}
      />
    );
  }
  if (requirementsQuery.isError) {
    return (
      <ErrorState
        error={requirementsQuery.error}
        onRetry={() => void requirementsQuery.refetch()}
      />
    );
  }

  const regulation = regulationQuery.data;
  const requirements = requirementsQuery.data;
  const findingByRequirement = new Map(
    (findingsQuery.data ?? []).map((finding) => [finding.requirement_id, finding]),
  );
  const isSelected = regulation.document_id === selectedRegulationId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={regulation.title}
        subtitle={`${regulation.authority_or_owner} · ${common("version")} ${regulation.version}`}
        actions={
          isSelected ? undefined : (
            <Button size="sm" onClick={() => selectRegulation(regulation.document_id)}>
              {t("select")}
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-[11px]">
          {regulation.document_id}
        </Badge>
        <DocumentStatusBadge status={regulation.status} />
        {regulation.domain.map((domain) => (
          <Badge key={domain} variant="outline" className="text-[11px]">
            {domain}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          {common("effectiveDate")} : {regulation.effective_date ?? common("notAvailable")}
        </span>
      </div>

      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">
            {t("requirementsHeading")} ({requirements.length})
          </TabsTrigger>
          <TabsTrigger value="source">{t("sourceText")}</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="mt-4 space-y-3">
          {requirements.length === 0 ? (
            <EmptyState message={t("requirementsEmpty")} />
          ) : (
            requirements.map((requirement) => {
              const finding = findingByRequirement.get(requirement.requirement_id);
              return (
                <Card key={requirement.requirement_id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium">
                        {requirement.requirement_id}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {requirement.source_reference}
                      </Badge>
                      {finding ? (
                        <AssessmentBadge assessment={finding.assessment} />
                      ) : null}
                      {finding ? (
                        <Button asChild size="sm" variant="ghost" className="ml-auto">
                          <Link href={`/evidence/${finding.finding_id}`}>
                            {t("viewFindings")}
                            <ChevronRight aria-hidden />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    <CardTitle className="text-sm font-medium leading-snug">
                      {requirement.normalized_requirement}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <blockquote
                      lang={requirement.language.toLowerCase()}
                      className="border-l-2 pl-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      {requirement.source_text}
                    </blockquote>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t("impactedActivity")} :
                      </span>
                      {requirement.impacted_activity.map((activity) => (
                        <Badge key={activity} variant="outline" className="text-[11px]">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="source" className="mt-4">
          <ScrollArea className="h-[32rem] rounded-lg border">
            <pre
              lang={regulation.language.toLowerCase()}
              className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed"
            >
              {regulation.extracted_text}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
