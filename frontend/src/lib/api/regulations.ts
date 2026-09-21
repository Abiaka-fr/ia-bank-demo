import { z } from "zod";

import {
  documentDetailSchema,
  documentMetaSchema,
  requirementSchema,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Préfixe des identifiants générés par `POST /api/regulations` (toujours simulé par
 * MSW, aucune route réelle — `docs/api-requests.md` #2/#8/#9). Sert à reconnaître un
 * document créé côté mock même en mode backend réel : sans ça, `fetchRegulation` sur
 * l'identifiant fraîchement créé interrogeait le vrai backend (qui ne le connaît pas)
 * et renvoyait « Resource not found » juste après l'upload.
 */
export const MOCK_UPLOAD_ID_PREFIX = "REG-UP-";

/**
 * Chaque fonction choisit sa source : backend réel quand il couvre l'endpoint et que
 * `NEXT_PUBLIC_BACKEND_URL` est renseigné, MSW sinon. Voir `./backend/config.ts`.
 */
export function fetchRegulations() {
  if (isBackendLive) return backend.fetchRegulations();
  return apiFetch("/api/regulations", z.array(documentMetaSchema));
}

export function fetchRegulation(id: string) {
  // Toujours créé par MSW (voir `MOCK_UPLOAD_ID_PREFIX`) : le backend réel ne le
  // connaîtra jamais, même quand il est branché.
  if (isBackendLive && !id.startsWith(MOCK_UPLOAD_ID_PREFIX)) {
    return backend.fetchDocumentDetail(id);
  }
  return apiFetch(`/api/regulations/${id}`, documentDetailSchema);
}

/** `domain` est appliqué côté serveur en mode réel, côté client en mode mock. */
export function fetchRegulationRequirements(
  id: string,
  filters: { domain?: string } = {},
) {
  if (isBackendLive) return backend.fetchRequirements(id, filters);

  return apiFetch(
    `/api/regulations/${id}/requirements`,
    z.array(requirementSchema),
  ).then((requirements) =>
    filters.domain
      ? requirements.filter((requirement) =>
          requirement.domain.includes(filters.domain as string),
        )
      : requirements,
  );
}

/**
 * `PUT /api/documents/:id/assignee` (Thư, 2026-09-15, commit `4ea5611`) en mode
 * backend réel — remplace l'ancien correctif local `regulation-assignee-overrides.ts`
 * (supprimé le même jour : le backend n'avait avant aucun champ `assignee` sur un
 * document, donc rien à y persister). En mode mock, `PATCH /api/regulations/:id`
 * fonctionne tel quel (le corpus MSW connaît déjà la régulation).
 */
export function updateRegulationAssignee(id: string, assigneeId: string) {
  if (isBackendLive) return backend.updateDocumentAssignee(id, assigneeId);
  return apiFetch(`/api/regulations/${id}`, documentMetaSchema, {
    method: "PATCH",
    body: { assignee_id: assigneeId },
  });
}

export function analyzeRegulation(id: string) {
  return apiFetch(
    `/api/regulations/${id}/analyze`,
    z.object({ status: z.literal("ANALYZING") }),
    { method: "POST" },
  );
}

/**
 * Extract regulatory requirements from a document using LLM analysis.
 * Returns the count of extracted requirements and their IDs.
 *
 * Endpoint: POST /api/requirements/extract
 * Uses backend when available, falls back to MSW mock otherwise.
 */
export function extractRequirements(documentId: string) {
  if (isBackendLive) return backend.extractRequirementsFromBackend(documentId);

  return apiFetch(
    "/api/requirements/extract",
    z.object({
      document_id: z.string(),
      requirements_count: z.number(),
      requirement_ids: z.array(z.string()),
    }),
    {
      method: "POST",
      body: { document_id: documentId },
    },
  );
}

/**
 * Analyze impact of requirements on internal procedures and generate mappings.
 * Takes a list of requirement IDs and uses LLM to assess impact on each procedure.
 *
 * Endpoint: POST /api/mappings/analyze
 */
export function analyzeMappings(requirementIds: string[]) {
  return apiFetch(
    "/api/mappings/analyze",
    z.array(
      z.object({
        requirement_id: z.string(),
        mappings_created: z.number(),
        mapping_ids: z.array(z.string()),
        warnings: z.array(z.string()),
      }),
    ),
    {
      method: "POST",
      body: { requirement_ids: requirementIds },
    },
  );
}
