"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Cable, FileStack, ListChecks, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPortfolioSummary } from "@/lib/api/dashboard";
import { fetchProcedures } from "@/lib/api/procedures";
import { fetchRegulations } from "@/lib/api/regulations";
import { queryKeys } from "@/lib/api/query-keys";

/** Date au format le plus récent parmi une liste — `undefined` si aucune valeur. */
function mostRecent(dates: readonly (string | undefined)[]): string | undefined {
  const known = dates.filter((date): date is string => Boolean(date));
  if (!known.length) return undefined;
  return known.reduce((latest, date) => (date > latest ? date : latest));
}

/**
 * Écran « Base de connaissances » (Phase 6 § 3) — version simple, sans rien attendre
 * de Thư : uniquement des chiffres déjà disponibles via les endpoints existants.
 * Aucune source européenne n'est réellement connectée — affiché honnêtement plutôt que
 * de simuler un statut « connecté » (docs/ui-guardrails.md).
 */
export function KnowledgeBaseView() {
  const t = useTranslations("knowledgeBase");
  const common = useTranslations("common");

  const regulationsQuery = useQuery({
    queryKey: queryKeys.regulations(),
    queryFn: fetchRegulations,
  });
  const proceduresQuery = useQuery({
    queryKey: queryKeys.procedures(),
    queryFn: fetchProcedures,
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: fetchPortfolioSummary,
  });

  if (regulationsQuery.isPending || proceduresQuery.isPending || summaryQuery.isPending) {
    return <LoadingState rows={4} />;
  }
  if (regulationsQuery.isError) {
    return (
      <ErrorState
        error={regulationsQuery.error}
        onRetry={() => void regulationsQuery.refetch()}
      />
    );
  }
  if (proceduresQuery.isError) {
    return (
      <ErrorState
        error={proceduresQuery.error}
        onRetry={() => void proceduresQuery.refetch()}
      />
    );
  }
  if (summaryQuery.isError) {
    return (
      <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
    );
  }

  const regulations = regulationsQuery.data;
  const procedures = proceduresQuery.data;
  const sources = Array.from(
    new Set(regulations.map((regulation) => regulation.authority_or_owner)),
  ).sort((a, b) => a.localeCompare(b));
  const lastUpdated = mostRecent([
    ...regulations.map((regulation) => regulation.uploaded_at),
    ...procedures.map((procedure) => procedure.uploaded_at),
  ]);

  const stats = [
    { label: t("regulationsCount"), value: regulations.length, icon: ScrollText },
    { label: t("proceduresCount"), value: procedures.length, icon: FileStack },
    {
      label: t("requirementsCount"),
      value: summaryQuery.data.requirements_identified,
      icon: ListChecks,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" aria-hidden />
            {t("bankSectionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <stat.icon className="size-3.5" aria-hidden />
                  {stat.label}
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t("sourcesLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <Badge key={source} variant="outline">
                  {source}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("lastUpdatedLabel")} :{" "}
            {lastUpdated ? lastUpdated.slice(0, 10) : common("notAvailable")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cable className="size-4" aria-hidden />
            {t("europeanSectionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Statut honnête (docs/ui-guardrails.md) : jamais "connecté" tant que rien
              de réel n'existe. Teinte neutre, pas une des 5 couleurs de statut — ce
              n'est pas un assessment. */}
          <Badge variant="secondary" className="text-xs font-medium">
            {t("notConnectedStatus")}
          </Badge>
          <p className="text-sm text-muted-foreground">{t("notConnectedDescription")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
