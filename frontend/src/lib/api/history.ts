import { z } from "zod";

import { auditHistoryEntrySchema } from "@/types/api";

import { apiFetch } from "./client";

/**
 * Historique des décisions humaines (Accepter / Rejeter / Escalader) prises sur les
 * constats d'une régulation. Non couvert par le backend — reste sur MSW dans les deux
 * modes, comme la validation humaine elle-même dont il découle.
 */
export function fetchRegulationHistory(regulationId: string) {
  return apiFetch(
    `/api/regulations/${regulationId}/history`,
    z.array(auditHistoryEntrySchema),
  );
}
