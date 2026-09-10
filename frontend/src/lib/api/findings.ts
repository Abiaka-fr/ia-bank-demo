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
 * Validation humaine — `PUT /api/mappings/:id/human-status`+`/assignee` depuis le
 * 2026-09-07 après-midi (commit `2e747d9`). L'onglet Historique, lui, reste sur MSW
 * dans les deux modes : le backend persiste la décision mais ne dit toujours pas qui
 * l'a prise (`actor_id`) — voir `docs/known-limitations.md` point 2 et
 * `backend/resources.ts::validateMapping` pour le détail de l'adaptation d'énumération.
 */
export function validateFinding(findingId: string, body: ValidateFindingBody) {
  if (isBackendLive) return backend.validateMapping(findingId, body);
  return apiFetch(`/api/findings/${findingId}/validate`, findingSchema, {
    method: "POST",
    body,
  });
}
