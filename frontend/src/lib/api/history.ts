import { z } from "zod";

import { auditHistoryEntrySchema } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Historique des décisions humaines (Accepter / Rejeter / Escalader) prises sur les
 * constats d'une régulation — table `mapping_history` en mode backend réel, MSW sinon.
 */
export function fetchRegulationHistory(regulationId: string) {
  if (isBackendLive) return backend.fetchMappingHistory(regulationId);
  return apiFetch(
    `/api/regulations/${regulationId}/history`,
    z.array(auditHistoryEntrySchema),
  );
}

/**
 * Historique des décisions pour un mapping spécifique — requête par mapping_id.
 */
export function fetchMappingHistoryById(mappingId: string) {
  if (isBackendLive) return backend.fetchMappingHistoryById(mappingId);
  return apiFetch(
    `/api/mappings/history`,
    z.array(auditHistoryEntrySchema),
    {
      searchParams: { mapping_id: mappingId },
    },
  );
}
