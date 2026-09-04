"use client";

import { useTranslations } from "next-intl";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding, Requirement } from "@/types/api";

/** Onglet « Exigences » : le texte source extrait, exigence par exigence. */
export function RequirementsTab({
  requirements,
  findings,
}: {
  requirements: readonly Requirement[];
  findings: readonly Finding[];
}) {
  const t = useTranslations("regulations");

  return (
    <div className="space-y-3">
      {requirements.map((requirement) => {
        // Une exigence peut porter plusieurs constats (un par procédure touchée).
        const related = findings.filter(
          (finding) => finding.requirement_id === requirement.requirement_id,
        );

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
                {related.map((finding) => (
                  <span key={finding.finding_id} className="flex items-center gap-1">
                    <AssessmentBadge assessment={finding.assessment} />
                    {finding.procedure_id ? (
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {finding.procedure_id}
                      </Badge>
                    ) : null}
                  </span>
                ))}
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
    </div>
  );
}
