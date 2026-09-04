"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { EvidenceStrength } from "@/components/features/evidence-strength";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { PriorityBadge } from "@/components/features/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { Finding, Requirement } from "@/types/api";

/** Table dense de l'écran "hero" — un constat par ligne, triée par priorité. */
export function FindingsTable({
  findings,
  requirementsById,
}: {
  findings: readonly Finding[];
  requirementsById: ReadonlyMap<string, Requirement>;
}) {
  const t = useTranslations("impact");

  // `TableCell` de shadcn applique `whitespace-nowrap` : la colonne Exigence, seule
  // colonne de texte long, repasse explicitement en retour à la ligne.
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%] min-w-[16rem]">
              {t("columnRequirement")}
            </TableHead>
            <TableHead>{t("columnAssessment")}</TableHead>
            <TableHead>{t("columnProcedures")}</TableHead>
            <TableHead>{t("columnPriority")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="hidden xl:table-cell">
              {t("columnStrength")}
            </TableHead>
            <TableHead className="w-16 text-right">
              <span className="sr-only">{t("open")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => {
            const requirement = requirementsById.get(finding.requirement_id);
            return (
              <TableRow key={finding.finding_id} className="align-top">
                <TableCell className="whitespace-normal py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium">
                      {finding.requirement_id}
                    </span>
                    {requirement ? (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {requirement.source_reference}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {requirement?.normalized_requirement}
                  </p>
                </TableCell>
                <TableCell>
                  <AssessmentBadge assessment={finding.assessment} />
                </TableCell>
                <TableCell>
                  {finding.matched_procedure_ids.length ? (
                    <div className="flex flex-wrap gap-1">
                      {finding.matched_procedure_ids.map((procedureId) => (
                        <Badge
                          key={procedureId}
                          variant="outline"
                          className="font-mono text-[11px]"
                        >
                          {procedureId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("noProcedure")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={finding.priority} />
                </TableCell>
                <TableCell>
                  <HumanStatusBadge status={finding.human_status} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <EvidenceStrength
                    value={finding.confidence_or_evidence_strength}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      href={`/evidence/${finding.finding_id}`}
                      aria-label={`${t("open")} ${finding.finding_id}`}
                    >
                      {t("open")}
                      <ChevronRight aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
