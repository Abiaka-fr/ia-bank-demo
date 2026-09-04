"use client";

import { ArrowLeft, ClipboardList, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { EvidenceCard } from "@/components/features/evidence-card";
import { EvidenceStrength } from "@/components/features/evidence-strength";
import { FindingValidation } from "@/components/features/finding-validation";
import { PriorityBadge } from "@/components/features/priority-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useRegulationFindings } from "@/lib/api/use-regulation-findings";

/** Vue "preuves côte à côte" : réglementation à gauche, procédure interne à droite. */
export function EvidenceView({ findingId }: { findingId: string }) {
  const t = useTranslations("evidence");
  const impact = useTranslations("impact");
  const regulationsT = useTranslations("regulations");
  const { selectedRegulationId } = useSelectedRegulation();
  const { findings, requirements, isPending, isError, error, refetch } =
    useRegulationFindings(selectedRegulationId);

  if (!selectedRegulationId) {
    return <EmptyState message={impact("emptyNoRegulation")} />;
  }
  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const finding = findings?.find((item) => item.finding_id === findingId);
  if (!finding) return <EmptyState message={t("notFound")} />;

  const requirement = requirements?.find(
    (item) => item.requirement_id === finding.requirement_id,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/impact-analysis">
            <ArrowLeft aria-hidden />
            {impact("title")}
          </Link>
        </Button>
        <span className="font-mono text-sm font-medium">
          {finding.requirement_id}
        </span>
        <AssessmentBadge assessment={finding.assessment} />
        <PriorityBadge priority={finding.priority} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("evidenceStrength")}</span>
          <EvidenceStrength value={finding.confidence_or_evidence_strength} />
        </div>
      </div>

      {requirement ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {regulationsT("normalized")} · {requirement.source_reference}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{requirement.normalized_requirement}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("regulatorySide")}</h2>
          {finding.regulatory_evidence.map((evidence) => (
            <EvidenceCard
              key={`${evidence.document_id}-${evidence.section_reference}`}
              evidence={evidence}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("internalSide")}</h2>
          {finding.internal_evidence.length ? (
            finding.internal_evidence.map((evidence) => (
              <EvidenceCard
                key={`${evidence.document_id}-${evidence.section_reference}`}
                evidence={evidence}
              />
            ))
          ) : (
            <EmptyState message={t("noInternalEvidence")} />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" aria-hidden />
              {t("explanation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{finding.explanation}</p>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("missingElements")}
              </h3>
              {finding.missing_or_ambiguous_elements.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {finding.missing_or_ambiguous_elements.map((element) => (
                    <li key={element}>{element}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noMissingElements")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" aria-hidden />
              {t("recommendedAction")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{finding.recommended_action}</p>
            {finding.reviewer_comment ? (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("reviewerComment")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {finding.reviewer_comment}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <FindingValidation finding={finding} />
    </div>
  );
}
