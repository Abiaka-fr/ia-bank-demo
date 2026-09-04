"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FindingActionRow } from "@/components/features/finding-action-row";
import { EmptyState } from "@/components/features/query-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assessmentValues,
  humanStatusValues,
  priorityValues,
  sortByPriority,
} from "@/lib/assessment";
import type { Assessment, Finding, HumanStatus, Priority, Requirement } from "@/types/api";

const ALL = "ALL";

type Filters = {
  assessment: Assessment | typeof ALL;
  priority: Priority | typeof ALL;
  humanStatus: HumanStatus | typeof ALL;
};

const NO_FILTERS: Filters = {
  assessment: ALL,
  priority: ALL,
  humanStatus: ALL,
};

/**
 * Écran « hero » : une ligne par couple (exigence × procédure), avec l'action
 * recommandée, l'action que le relecteur souhaite retenir, et sa décision.
 */
export function FindingsActionsTable({
  findings,
  requirements,
  regulationId,
}: {
  findings: readonly Finding[];
  requirements: readonly Requirement[];
  regulationId: string;
}) {
  const t = useTranslations("actions");
  const impact = useTranslations("impact");
  const common = useTranslations("common");
  const assessmentLabels = useTranslations("assessment");
  const priorityLabels = useTranslations("priority");
  const statusLabels = useTranslations("humanStatus");

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const requirementsById = useMemo(
    () => new Map(requirements.map((item) => [item.requirement_id, item])),
    [requirements],
  );

  const visibleFindings = useMemo(
    () =>
      sortByPriority(
        findings.filter(
          (finding) =>
            (filters.assessment === ALL ||
              finding.assessment === filters.assessment) &&
            (filters.priority === ALL || finding.priority === filters.priority) &&
            (filters.humanStatus === ALL ||
              finding.human_status === filters.humanStatus),
        ),
      ),
    [findings, filters],
  );

  const hasActiveFilter =
    filters.assessment !== ALL ||
    filters.priority !== ALL ||
    filters.humanStatus !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.assessment}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              assessment: value as Filters["assessment"],
            }))
          }
        >
          <SelectTrigger size="sm" aria-label={impact("filterAssessment")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {impact("filterAssessment")}: {impact("filterAll")}
            </SelectItem>
            {assessmentValues.map((value) => (
              <SelectItem key={value} value={value}>
                {assessmentLabels(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              priority: value as Filters["priority"],
            }))
          }
        >
          <SelectTrigger size="sm" aria-label={impact("filterPriority")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {impact("filterPriority")}: {impact("filterAll")}
            </SelectItem>
            {priorityValues.map((value) => (
              <SelectItem key={value} value={value}>
                {priorityLabels(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.humanStatus}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              humanStatus: value as Filters["humanStatus"],
            }))
          }
        >
          <SelectTrigger size="sm" aria-label={impact("filterStatus")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {impact("filterStatus")}: {impact("filterAll")}
            </SelectItem>
            {humanStatusValues.map((value) => (
              <SelectItem key={value} value={value}>
                {statusLabels(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilter ? (
          <Button size="sm" variant="ghost" onClick={() => setFilters(NO_FILTERS)}>
            <RotateCcw aria-hidden />
            {impact("resetFilters")}
          </Button>
        ) : null}

        <p className="ml-auto text-xs text-muted-foreground">
          {common("resultCount", { count: visibleFindings.length })} ·{" "}
          {t("expandHint")}
        </p>
      </div>

      {visibleFindings.length === 0 ? (
        <EmptyState message={impact("empty")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%] min-w-[15rem]">
                  {t("columnRequirement")}
                </TableHead>
                <TableHead className="w-[12%]">{t("columnProcedure")}</TableHead>
                <TableHead className="w-[22%]">{t("columnRecommended")}</TableHead>
                <TableHead className="w-[22%] whitespace-normal">
                  {t("columnCustom")}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {t("customActionHelp")}
                  </span>
                </TableHead>
                <TableHead className="w-[18%]">{t("columnDecision")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFindings.map((finding) => (
                <FindingActionRow
                  key={finding.finding_id}
                  finding={finding}
                  requirement={requirementsById.get(finding.requirement_id)}
                  regulationId={regulationId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
