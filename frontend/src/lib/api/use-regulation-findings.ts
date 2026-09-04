"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFindingsByRegulation } from "./findings";
import { queryKeys } from "./query-keys";
import { fetchRegulationRequirements } from "./regulations";

/**
 * Constats + exigences de la régulation sélectionnée.
 *
 * `docs/api-contract.md` n'expose pas de `GET /api/findings/:id` : un écran centré
 * sur un constat récupère la liste de la régulation et y sélectionne son constat.
 */
export function useRegulationFindings(regulationId: string | null) {
  const findingsQuery = useQuery({
    queryKey: queryKeys.findings(regulationId ?? undefined),
    queryFn: () => fetchFindingsByRegulation(regulationId!),
    enabled: Boolean(regulationId),
  });

  const requirementsQuery = useQuery({
    queryKey: queryKeys.regulationRequirements(regulationId ?? ""),
    queryFn: () => fetchRegulationRequirements(regulationId!),
    enabled: Boolean(regulationId),
  });

  return {
    findings: findingsQuery.data,
    requirements: requirementsQuery.data,
    isPending: findingsQuery.isPending || requirementsQuery.isPending,
    isError: findingsQuery.isError || requirementsQuery.isError,
    error: findingsQuery.error ?? requirementsQuery.error,
    refetch: () => {
      void findingsQuery.refetch();
      void requirementsQuery.refetch();
    },
  };
}
