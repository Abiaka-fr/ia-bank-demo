"use client";

import { cn } from "cn";
import { ChevronRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { FindingDetailDialog } from "@/components/features/finding-detail-dialog";
import { EmptyState } from "@/components/features/query-state";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { ReviewProgressBar } from "@/components/features/review-progress";
import { Badge } from "@/components/ui/badge";
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
  const [openDetail, setOpenDetail] = useState<{
    finding: Finding;
    requirement: Requirement;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<string>(ALL_DOMAINS);

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
        const related = findings.filter(
          (finding) => finding.requirement_id === requirement.requirement_id,
        );

        const counts = humanStatusValues.map((human_status) => ({
          human_status,
          count: related.filter((finding) => finding.human_status === human_status)
            .length,
        }));

        // Une exigence sans constat n'a nulle part où naviguer : la carte reste
        // alors statique plutôt que d'offrir un lien qui ne mène à rien.
        const singleFinding = related.length === 1 ? related[0] : undefined;
        const focusHref =
          related.length > 1
            ? `/regulations/${regulationId}?tab=actions&focus=${requirement.requirement_id}`
            : undefined;
        const isClickable = Boolean(singleFinding) || Boolean(focusHref);

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

        function openSingleFindingDetail() {
          if (singleFinding) setOpenDetail({ finding: singleFinding, requirement });
        }

        return (
          <Card
            key={requirement.requirement_id}
            className={cn(
              isClickable &&
                "relative transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30",
            )}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium">
                  {requirement.requirement_id}
                </span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {requirement.source_reference}
                </Badge>
                {related.map((finding) => (
                  <span key={finding.finding_id} className="flex items-center gap-1">
                    <AssessmentBadge assessment={finding.assessment} />
                    {finding.procedure_id ? (
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {finding.procedure_id}
                      </Badge>
                    ) : null}
                    <HumanStatusBadge status={finding.human_status} />
                  </span>
                ))}
                {singleFinding ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="relative z-10 ml-auto"
                    onClick={openSingleFindingDetail}
                  >
                    {actionsT("goToRequirement")}
                    <ChevronRight aria-hidden />
                  </Button>
                ) : focusHref ? (
                  <Button asChild size="sm" variant="ghost" className="relative z-10 ml-auto">
                    <Link href={focusHref}>
                      {actionsT("goToRequirement")}
                      <ChevronRight aria-hidden />
                    </Link>
                  </Button>
                ) : null}
              </div>
              <CardTitle className="text-sm font-medium leading-snug">
                {singleFinding ? (
                  // `::after` couvre toute la carte, comme la variante `Link`
                  // ci-dessous — mêmes styles, ouvre le détail au lieu de naviguer.
                  <button
                    type="button"
                    onClick={openSingleFindingDetail}
                    className="text-left after:absolute after:inset-0 hover:underline focus:outline-none"
                  >
                    {displayedRequirementText}
                  </button>
                ) : focusHref ? (
                  // `::after` couvre toute la carte : cliquer n'importe où dessus
                  // navigue, comme les cartes de régulation (regulations-view.tsx).
                  <Link
                    href={focusHref}
                    className="after:absolute after:inset-0 hover:underline focus:outline-none"
                  >
                    {displayedRequirementText}
                  </Link>
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
              <div className="flex flex-wrap items-center gap-1">
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
      })}

      {openDetail ? (
        <FindingDetailDialog
          finding={openDetail.finding}
          requirement={openDetail.requirement}
          isOpen
          onOpenChange={(open) => {
            if (!open) setOpenDetail(null);
          }}
          regulationId={regulationId}
        />
      ) : null}
    </div>
  );
}
