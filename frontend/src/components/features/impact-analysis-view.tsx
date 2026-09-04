"use client";

import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FindingsTable } from "@/components/features/findings-table";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFindingsByRegulation } from "@/lib/api/findings";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchRegulationRequirements } from "@/lib/api/regulations";
import {
  assessmentValues,
  humanStatusValues,
  priorityValues,
  sortByPriority,
} from "@/lib/assessment";
import type { Assessment, HumanStatus, Priority } from "@/types/api";

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

export function ImpactAnalysisView() {
  const t = useTranslations("impact");
  const assessmentLabels = useTranslations("assessment");
  const priorityLabels = useTranslations("priority");
  const statusLabels = useTranslations("humanStatus");
  const common = useTranslations("common");

  const { selectedRegulationId } = useSelectedRegulation();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const findingsQuery = useQuery({
    queryKey: queryKeys.findings(selectedRegulationId ?? undefined),
    queryFn: () => fetchFindingsByRegulation(selectedRegulationId!),
    enabled: Boolean(selectedRegulationId),
  });

  const requirementsQuery = useQuery({
    queryKey: queryKeys.regulationRequirements(selectedRegulationId ?? ""),
    queryFn: () => fetchRegulationRequirements(selectedRegulationId!),
    enabled: Boolean(selectedRegulationId),
  });

  const requirementsById = useMemo(
    () =>
      new Map(
        (requirementsQuery.data ?? []).map((requirement) => [
          requirement.requirement_id,
          requirement,
        ]),
      ),
    [requirementsQuery.data],
  );

  const allFindings = findingsQuery.data;
  const visibleFindings = useMemo(
    () =>
      sortByPriority(
        (allFindings ?? []).filter(
          (finding) =>
            (filters.assessment === ALL ||
              finding.assessment === filters.assessment) &&
            (filters.priority === ALL || finding.priority === filters.priority) &&
            (filters.humanStatus === ALL ||
              finding.human_status === filters.humanStatus),
        ),
      ),
    [allFindings, filters],
  );

  if (!selectedRegulationId) {
    return <EmptyState message={t("emptyNoRegulation")} />;
  }

  if (findingsQuery.isPending || requirementsQuery.isPending) {
    return <LoadingState rows={6} />;
  }

  if (findingsQuery.isError || requirementsQuery.isError) {
    return (
      <ErrorState
        error={findingsQuery.error ?? requirementsQuery.error}
        onRetry={() => {
          void findingsQuery.refetch();
          void requirementsQuery.refetch();
        }}
      />
    );
  }

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
          <SelectTrigger size="sm" aria-label={t("filterAssessment")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterAssessment")}: {t("filterAll")}</SelectItem>
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
          <SelectTrigger size="sm" aria-label={t("filterPriority")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterPriority")}: {t("filterAll")}</SelectItem>
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
          <SelectTrigger size="sm" aria-label={t("filterStatus")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterStatus")}: {t("filterAll")}</SelectItem>
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
            {t("resetFilters")}
          </Button>
        ) : null}

        <p className="ml-auto text-xs text-muted-foreground">
          {common("resultCount", { count: visibleFindings.length })} ·{" "}
          {t("sortedByPriority")}
        </p>
      </div>

      {visibleFindings.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <FindingsTable
          findings={visibleFindings}
          requirementsById={requirementsById}
        />
      )}
    </div>
  );
}
