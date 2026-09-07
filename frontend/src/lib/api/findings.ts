import { z } from "zod";

import { findingSchema, type ValidateFindingBody } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Depuis le `GET /api/mappings/*` ajouté par Thư (2026-09-07), les constats d'une
 * régulation peuvent être reconstruits en réel (voir `backend/finding-adapt.ts` pour
 * les limites assumées, notamment sur `internal_evidence`).
 */
export function fetchFindingsByRegulation(regulationId: string) {
  if (isBackendLive) return backend.fetchFindings(regulationId);
  return apiFetch("/api/findings", z.array(findingSchema), {
    searchParams: { regulation_id: regulationId },
  });
}

/**
 * Inutilisé par l'UI actuelle (voir `regulation-detail-view.tsx`, qui ne consomme que
 * `fetchFindingsByRegulation`) — conservé sur MSW car le client API reflète le contrat
 * endpoint par endpoint.
 */
export function fetchFindingsByRequirement(requirementId: string) {
  return apiFetch(
    `/api/requirements/${requirementId}/findings`,
    z.array(findingSchema),
  );
}

/**
 * Validation humaine — non couverte par le backend (aucune route de validation sous
 * `/api/mappings`), reste sur MSW dans les deux modes.
 */
export function validateFinding(findingId: string, body: ValidateFindingBody) {
  return apiFetch(`/api/findings/${findingId}/validate`, findingSchema, {
    method: "POST",
    body,
  });
}
