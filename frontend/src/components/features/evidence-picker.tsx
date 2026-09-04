"use client";

import { useTranslations } from "next-intl";

import { FindingsTable } from "@/components/features/findings-table";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { useRegulationFindings } from "@/lib/api/use-regulation-findings";
import { sortByPriority } from "@/lib/assessment";

/** Écran `/evidence` sans constat sélectionné : liste dans laquelle en choisir un. */
export function EvidencePicker() {
  const t = useTranslations("evidence");
  const impact = useTranslations("impact");
  const { selectedRegulationId } = useSelectedRegulation();
  const { findings, requirements, isPending, isError, error, refetch } =
    useRegulationFindings(selectedRegulationId);

  if (!selectedRegulationId) {
    return <EmptyState message={impact("emptyNoRegulation")} />;
  }
  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!findings?.length) return <EmptyState message={t("empty")} />;

  const requirementsById = new Map(
    (requirements ?? []).map((requirement) => [
      requirement.requirement_id,
      requirement,
    ]),
  );

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{t("pickerHeading")}</h2>
      <FindingsTable
        findings={sortByPriority(findings)}
        requirementsById={requirementsById}
      />
    </div>
  );
}
