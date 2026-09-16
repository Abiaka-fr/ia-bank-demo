import { z } from "zod";

import type { ExtractedChunk } from "@/lib/file-extract";
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
 * Upload — non couvert par le backend (aucune route `POST /api/regulations`,
 * `docs/api-requests.md` #2/#8), donc toujours servi par MSW. `.docx`/`.xlsx`
 * uniquement, validé aussi côté serveur.
 */
export function uploadRegulation(input: {
  file: File;
  assigneeId?: string;
  uploadedById?: string;
  /**
   * Contenu extrait côté client avant l'appel (demande de Thư, 2026-09-14 — voir
   * `lib/file-extract.ts`). Envoyé en JSON dans le multipart : pas de route réelle
   * pour valider la forme exacte qu'elle attendra, donc pas de nouveau schéma Zod
   * inventé ici — seul le mock MSW le lit pour l'instant.
   */
  chunks?: readonly ExtractedChunk[];
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  // Nom envoyé explicitement : certains runtimes ne conservent pas le nom du
  // fichier dans la partie multipart, ce qui rendrait le contrôle d'extension
  // silencieusement faux.
  formData.append("file_name", input.file.name);
  if (input.assigneeId) formData.append("assignee_id", input.assigneeId);
  if (input.uploadedById) formData.append("uploaded_by_id", input.uploadedById);
  if (input.chunks?.length) {
    formData.append("extracted_chunks", JSON.stringify(input.chunks));
  }

  return apiFetch("/api/regulations", documentMetaSchema, {
    method: "POST",
    formData,
  });
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
