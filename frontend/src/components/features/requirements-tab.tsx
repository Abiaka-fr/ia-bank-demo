"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ChevronDown, ChevronRight, Search, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { EmptyState } from "@/components/features/query-state";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { ImpactedProcedureSummary } from "@/components/features/impacted-procedure-summary";
import { ReviewProgressBar } from "@/components/features/review-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { humanStatusValues } from "@/lib/assessment";
import { pickLocalizedText } from "@/lib/localized-text";
import { analyzeMappings } from "@/lib/api/regulations";
import { queryKeys } from "@/lib/api/query-keys";
import { openInNewTabWithSession } from "@/lib/open-in-new-tab";
import type { Finding, Requirement } from "@/types/api";

const ALL_DOMAINS = "ALL";

/**
 * Onglet « Exigences » : le texte source extrait, exigence par exigence, avec l'état
 * de traitement de ses constats. Recherche plein texte (identifiant, référence, texte
 * normalisé et source) et filtre par domaine, en local sur les exigences déjà chargées.
 *
 * Cliquer sur une exigence à **un seul** constat (une seule procédure touchée) ouvre
 * directement son détail (`FindingDetailDialog`) — pas la peine de changer d'onglet
 * pour une seule ligne. Une exigence à **plusieurs** constats (plusieurs procédures)
 * bascule vers l'onglet « Analyse d'impact » positionné sur ses lignes : un seul
 * dialogue ne peut pas représenter plusieurs couples exigence × procédure à la fois.
 */
export function RequirementsTab({
  requirements,
  findings,
  regulationId,
}: {
  requirements: readonly Requirement[];
  findings: readonly Finding[];
  regulationId: string;
}) {
  const t = useTranslations("regulations");
  const actionsT = useTranslations("actions");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<string>(ALL_DOMAINS);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const analyzeMutation = useMutation({
    mutationFn: (requirementId: string) => analyzeMappings([requirementId]),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.findings(regulationId),
      });
      const mappingsCreated = data.reduce((sum, item) => sum + item.mappings_created, 0);
      toast.success(t("analyzeSuccess", { count: mappingsCreated }), {
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("analyzeFailed"), {
        description: errorMessage,
        duration: 5000,
      });
    },
  });

  const domains = useMemo(
    () =>
      Array.from(
        new Set(requirements.flatMap((requirement) => requirement.domain)),
      ).sort((a, b) => a.localeCompare(b)),
    [requirements],
  );

  const visibleRequirements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requirements.filter((requirement) => {
      const matchesDomain =
        domain === ALL_DOMAINS || requirement.domain.includes(domain);
      const matchesQuery =
        query === "" ||
        [
          requirement.requirement_id,
          requirement.source_reference,
          requirement.normalized_requirement,
          requirement.normalized_requirement_fr ?? "",
          requirement.source_text,
          requirement.source_text_fr ?? "",
        ].some((field) => field.toLowerCase().includes(query));
      return matchesDomain && matchesQuery;
    });
  }, [requirements, search, domain]);

  const hasActiveFilter = search.trim() !== "" || domain !== ALL_DOMAINS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger size="sm" aria-label={t("filterDomain")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DOMAINS}>
              {t("filterDomain")}: {t("filterAllDomains")}
            </SelectItem>
            {domains.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilter ? (
          <span className="text-xs text-muted-foreground">
            {t("searchResultsCount", { count: visibleRequirements.length })}
          </span>
        ) : null}
      </div>

      {visibleRequirements.length === 0 ? (
        <EmptyState message={t("searchNoResults")} />
      ) : null}

      {visibleRequirements.map((requirement) => {
        // Une exigence peut porter plusieurs constats (un par procédure touchée).
        // Exclude NO_RELEVANT_PROCEDURE findings as they are not real findings
        const related = findings.filter(
          (finding) =>
            finding.requirement_id === requirement.requirement_id &&
            finding.assessment !== "NO_RELEVANT_PROCEDURE",
        );

        const counts = humanStatusValues.map((human_status) => ({
          human_status,
          count: related.filter((finding) => finding.human_status === human_status)
            .length,
        }));
        // Open detail dialog with first finding when available
        const firstFinding = related.length > 0 ? related[0] : undefined;
        const focusHref = firstFinding
          ? `/regulations/${regulationId}?tab=actions&focus=${requirement.requirement_id}`
          : undefined;

        const isExpanded = expandedFindings.has(requirement.requirement_id);
        const toggleExpand = () => {
          const newExpanded = new Set(expandedFindings);
          if (newExpanded.has(requirement.requirement_id)) {
            newExpanded.delete(requirement.requirement_id);
          } else {
            newExpanded.add(requirement.requirement_id);
          }
          setExpandedFindings(newExpanded);
        };

        // v1.9 — variantes françaises (Thư, `be74658`) : la langue d'origine du corpus
        // reste `requirement.language`, l'interface choisit la variante à afficher
        // (voir `lib/localized-text.ts`, même convention que `Finding.explanation_fr`).
        const displayedRequirementText = pickLocalizedText(
          locale,
          requirement.normalized_requirement,
          requirement.normalized_requirement_fr,
        );
        const displayedSourceText = pickLocalizedText(
          locale,
          requirement.source_text,
          requirement.source_text_fr,
        );
        const sourceTextLang =
          locale === "fr" && requirement.source_text_fr
            ? "fr"
            : requirement.language.toLowerCase();

        // Build new-tab href for the first finding if available
        const canOpenFinding = firstFinding && firstFinding.procedure_id;
        const newTabHref = canOpenFinding
          ? `/${locale}/findings/${firstFinding.finding_id}?regulationId=${regulationId}&requirementId=${requirement.requirement_id}`
          : undefined;

        function openFindingDetail() {
          if (newTabHref) {
            openInNewTabWithSession(newTabHref);
          }
        }

        return (
          <Card
            key={requirement.requirement_id}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium">
                  {requirement.requirement_id}
                </span>
                {firstFinding && focusHref ? (
                  <Button asChild size="sm" variant="ghost" className="relative z-10 ml-auto">
                    <Link href={focusHref}>
                      {actionsT("goToRequirement")}
                      <ChevronRight aria-hidden />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="relative z-10 ml-auto gap-1"
                    onClick={() => analyzeMutation.mutate(requirement.requirement_id)}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                        {t("analyzing")}
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />
                        {t("analyzeImpactButton")}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <CardTitle className="text-sm font-medium leading-snug">
                {firstFinding ? (
                  <button
                    type="button"
                    onClick={openFindingDetail}
                    className="text-left hover:underline focus:outline-none"
                  >
                    {displayedRequirementText}
                  </button>
                ) : (
                  displayedRequirementText
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {related.length ? (
                <ReviewProgressBar counts={counts} showBreakdown={false} />
              ) : null}
              <blockquote
                lang={sourceTextLang}
                className="border-l-2 pl-3 text-sm leading-relaxed text-muted-foreground"
              >
                {displayedSourceText}
              </blockquote>
              {related.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand();
                    }}
                    className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                      aria-hidden
                    />
                    {t("impactedProceduresToggle", { count: related.length })}
                  </button>
                  {isExpanded && (
                    <div className="space-y-1 pt-2">
                      <p className="text-xs text-muted-foreground">{t("impactedProceduresHint")}</p>
                      {related.map((finding) => {
                        const canOpenRow = finding.procedure_id !== null && finding.procedure_id !== undefined;
                        const rowHref = canOpenRow
                          ? `/${locale}/findings/${finding.finding_id}?regulationId=${regulationId}&requirementId=${requirement.requirement_id}`
                          : undefined;

                        return (
                          <button
                            key={finding.finding_id}
                            type="button"
                            onClick={() => {
                              if (rowHref) openInNewTabWithSession(rowHref);
                            }}
                            disabled={!canOpenRow}
                            className={cn(
                              "w-full flex items-start justify-between gap-3 border-l-2 border-muted-foreground/20 py-2 pl-3 pr-2 rounded transition-colors",
                              canOpenRow && "hover:bg-accent cursor-pointer",
                              !canOpenRow && "text-muted-foreground cursor-default",
                            )}
                          >
                            <ImpactedProcedureSummary finding={finding} className="flex-1" />
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <AssessmentBadge assessment={finding.assessment} />
                              <HumanStatusBadge status={finding.human_status} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
