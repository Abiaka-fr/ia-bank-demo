import { z } from "zod";

import { findingSchema, type ValidateFindingBody } from "@/types/api";

import { apiFetch } from "./client";

export function fetchFindingsByRegulation(regulationId: string) {
  return apiFetch("/api/findings", z.array(findingSchema), {
    searchParams: { regulation_id: regulationId },
  });
}

export function fetchFindingsByRequirement(requirementId: string) {
  return apiFetch(
    `/api/requirements/${requirementId}/findings`,
    z.array(findingSchema),
  );
}

export function validateFinding(findingId: string, body: ValidateFindingBody) {
  return apiFetch(`/api/findings/${findingId}/validate`, findingSchema, {
    method: "POST",
    body,
  });
}
