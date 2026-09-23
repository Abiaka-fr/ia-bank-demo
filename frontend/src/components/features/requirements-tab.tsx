"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ChevronDown, Search, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { EmptyState } from "@/components/features/query-state";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { ImpactedProcedureSummary } from "@/components/features/impacted-procedure-summary";
import { ReviewProgressBar } from "@/components/features/review-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanStatusValues } from "@/lib/assessment";
import { pickLocalizedText } from "@/lib/localized-text";
import { highlightSegments } from "@/lib/evidence-match";
import { analyzeMappings, fetchRegulation } from "@/lib/api/regulations";
import { queryKeys } from "@/lib/api/query-keys";
import { openInNewTabWithSession } from "@/lib/open-in-new-tab";
import type { Finding, Requirement } from "@/types/api";

const ALL_DOMAINS = "ALL";

/**
 * Onglet « Exigences » : le texte source extrait, exigence par exigence, avec l'état
 * de traitement de ses constats. Recherche plein texte (identifiant, référence, texte
 * normalisé et source) et filtre par domaine, en local sur les exigences déjà chargées.
 *
 * Le titre et le bouton « Traiter » ouvrent (nouvel onglet) la page du premier constat ;
 * chaque ligne de « Procédures impactées » ouvre celle de son propre constat.
 * `focus` (`?tab=requirements&focus=REQ-…`, liens de la carte mentale et des pages de
 * constat/procédure) met l'exigence en avant, dépliée.
 */
export function RequirementsTab({
  requirements,
  findings,
  regulationId,
  focus,
  findingsLoaded,
}: {
  requirements: readonly Requirement[];
  findings: readonly Finding[];
  regulationId: string;
  focus?: string | null;
  /** Faux tant que les constats chargent (ou en erreur) : « aucun constat » n'est pas encore sûr. */
  findingsLoaded: boolean;
}) {
  const t = useTranslations("regulations");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<string>(ALL_DOMAINS);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(
    () => new Set(focus ? [focus] : []),
  );
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [analyzingRequirementId, setAnalyzingRequirementId] = useState<string | null>(null);

  const selectedReq = requirements.find((req) => req.requirement_id === selectedRequirementId);

  const regulationQuery = useQuery({
    queryKey: queryKeys.regulation(regulationId),
    queryFn: () => fetchRegulation(regulationId),
    enabled: !!selectedRequirementId,
  });

  useEffect(() => {
    if (focus) document.getElementById(`requirement-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus]);

  const analyzeMutation = useMutation({
    mutationFn: (requirementId: string) => analyzeMappings([requirementId]),
    onMutate: (requirementId: string) => {
      setAnalyzingRequirementId(requirementId);
    },
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
    onSettled: () => {
      setAnalyzingRequirementId(null);
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
        const firstFinding = related.length > 0 ? related[0] : undefined;

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

        return (
          <Card
            key={requirement.requirement_id}
            id={`requirement-${requirement.requirement_id}`}
            className={cn(
              "scroll-mt-24",
              // Teinte neutre : les couleurs de statut restent réservées à `assessment`.
              focus === requirement.requirement_id && "ring-1 ring-foreground/25",
            )}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium">
                  {requirement.requirement_id}
                </span>
                {canOpenFinding ? null : findingsLoaded ? (
                  // Masqué pendant le chargement : un clic relançait l'analyse LLM d'une
                  // exigence déjà analysée et créait des mappings en double.
                  <Button
                    size="sm"
                    variant="default"
                    className="relative z-10 ml-auto gap-1"
                    onClick={() => analyzeMutation.mutate(requirement.requirement_id)}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzingRequirementId === requirement.requirement_id ? (
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
                ) : null}
              </div>
              <CardTitle className="text-sm font-medium leading-snug">
                {firstFinding ? (
                  <button
                    type="button"
                    onClick={() => setSelectedRequirementId(requirement.requirement_id)}
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
                <ReviewProgressBar counts={counts} showBreakdown={false} className="space-y-0.5" />
              ) : null}
              <blockquote
                lang={sourceTextLang}
                className="border-l-2 pl-3 text-sm leading-relaxed text-muted-foreground"
              >
                {displayedSourceText}
              </blockquote>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRequirementId(requirement.requirement_id)}
              >
                {t("sourceEvidence")}
              </Button>
              {related.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3 mt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand();
                    }}
                    className="flex w-full items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-100 hover:text-blue-700 dark:hover:text-blue-200"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                      aria-hidden
                    />
                    {t("impactedProceduresToggle", { count: related.length })}
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-blue-700 dark:text-blue-200">{t("impactedProceduresHint")}</p>
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
                              "w-full flex items-start justify-between gap-3 border-l-4 border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-950 py-2 pl-3 pr-2 rounded transition-colors",
                              canOpenRow && "hover:bg-blue-100/50 dark:hover:bg-blue-900/30 cursor-pointer",
                              !canOpenRow && "text-muted-foreground cursor-default opacity-60",
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

      {/* Requirement detail modal */}
      {selectedRequirementId && selectedReq && (
        <Dialog
          open={!!selectedRequirementId}
          onOpenChange={(open) => !open && setSelectedRequirementId(null)}
        >
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>{t("requirementDetailsTitle")}</DialogTitle>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("requirementId")}
                </p>
                <p className="font-mono text-sm">{selectedReq.requirement_id}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("requirement")}
                </p>
                <p className="text-sm">
                  {pickLocalizedText(
                    locale,
                    selectedReq.normalized_requirement,
                    selectedReq.normalized_requirement_fr,
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("sourceDocumentEvidence")}
                </p>
                {regulationQuery.isPending ? (
                  <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                ) : regulationQuery.isError ? (
                  <p className="text-xs text-destructive">{t("loadFailed")}</p>
                ) : (
                  <div className="bg-muted/30 p-4 rounded max-h-96 overflow-y-auto">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        const docText = regulationQuery.data?.extracted_text || "";
                        const evidenceRefs = [
                          {
                            document_id: regulationId,
                            document_title: regulationQuery.data?.title || "",
                            section_reference: selectedReq.source_reference || "",
                            excerpt: pickLocalizedText(
                              locale,
                              selectedReq.source_text,
                              selectedReq.source_text_fr,
                            ),
                            language: locale === "fr" ? ("FR" as const) : ("EN" as const),
                          },
                        ];
                        const segments = highlightSegments(docText, evidenceRefs);
                        return segments.map((segment, idx) =>
                          segment.isMatch ? (
                            <mark
                              key={idx}
                              className="bg-yellow-200 dark:bg-yellow-900/40 rounded px-0.5"
                            >
                              {segment.text}
                            </mark>
                          ) : (
                            <span key={idx}>{segment.text}</span>
                          ),
                        );
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {selectedReq.domain.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    {t("filterDomain")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReq.domain.map((domain) => (
                      <span
                        key={domain}
                        className="inline-block text-xs bg-muted px-2 py-1 rounded"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
