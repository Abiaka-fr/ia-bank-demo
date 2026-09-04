"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { Link } from "@/i18n/navigation";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchRegulations } from "@/lib/api/regulations";

export function RegulationsView() {
  const t = useTranslations("regulations");
  const common = useTranslations("common");
  const { selectedRegulationId, selectRegulation } = useSelectedRegulation();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.regulations(),
    queryFn: fetchRegulations,
  });

  if (isPending) return <LoadingState rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data.length) return <EmptyState message={t("empty")} />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((regulation) => {
        const isSelected = regulation.document_id === selectedRegulationId;
        return (
          <Card key={regulation.document_id} className={isSelected ? "border-foreground/30" : undefined}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {regulation.document_id}
                </Badge>
                <DocumentStatusBadge status={regulation.status} />
                {isSelected ? (
                  <Badge className="ml-auto">{t("selected")}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-base leading-snug">
                {regulation.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <dt className="text-xs text-muted-foreground">{common("domain")}</dt>
                  <dd className="flex flex-wrap gap-1">
                    {regulation.domain.map((domain) => (
                      <Badge key={domain} variant="outline" className="text-[11px]">
                        {domain}
                      </Badge>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{common("language")}</dt>
                  <dd>{regulation.language}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/regulations/${regulation.document_id}`}>
                    {t("detailHeading")}
                    <ChevronRight aria-hidden />
                  </Link>
                </Button>
                {!isSelected ? (
                  <Button
                    size="sm"
                    onClick={() => selectRegulation(regulation.document_id)}
                  >
                    {t("select")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
