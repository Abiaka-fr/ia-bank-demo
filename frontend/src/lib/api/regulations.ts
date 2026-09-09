import { z } from "zod";

import {
  documentDetailSchema,
  documentMetaSchema,
  requirementSchema,
  type DocumentMeta,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";
import {
  getRegulationAssigneeOverride,
  setRegulationAssigneeOverride,
} from "./regulation-assignee-overrides";

/**
 * Le backend réel n'a pas de champ `assignee_id` sur un document : voir
 * `regulation-assignee-overrides.ts` pour le pourquoi de ce correctif purement local.
 */
function withAssigneeOverride<T extends DocumentMeta>(document: T): T {
  const override = getRegulationAssigneeOverride(document.document_id);
  return override ? { ...document, assignee_id: override } : document;
}

/**
 * Chaque fonction choisit sa source : backend réel quand il couvre l'endpoint et que
 * `NEXT_PUBLIC_BACKEND_URL` est renseigné, MSW sinon. Voir `./backend/config.ts`.
 */
export function fetchRegulations() {
  if (isBackendLive) {
    return backend.fetchRegulations().then((docs) => docs.map(withAssigneeOverride));
  }
  return apiFetch("/api/regulations", z.array(documentMetaSchema));
}

export function fetchRegulation(id: string) {
  if (isBackendLive) {
    return backend.fetchDocumentDetail(id).then(withAssigneeOverride);
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
 * Upload — non couvert par le backend (aucune route `POST /api/regulations`), donc
 * toujours servi par MSW. `.docx` uniquement, validé aussi côté serveur.
 */
export function uploadRegulation(input: {
  file: File;
  assigneeId?: string;
  uploadedById?: string;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  // Nom envoyé explicitement : certains runtimes ne conservent pas le nom du
  // fichier dans la partie multipart, ce qui rendrait le contrôle d'extension
  // silencieusement faux.
  formData.append("file_name", input.file.name);
  if (input.assigneeId) formData.append("assignee_id", input.assigneeId);
  if (input.uploadedById) formData.append("uploaded_by_id", input.uploadedById);

  return apiFetch("/api/regulations", documentMetaSchema, {
    method: "POST",
    formData,
  });
}

/**
 * Assignation — non couverte par le backend. En mode mock, `PATCH /api/regulations/:id`
 * fonctionne tel quel (le corpus MSW connaît déjà la régulation). En mode backend réel,
 * ce même chemin 404ait systématiquement : la régulation affichée (un vrai document du
 * backend, ex. `EXT-EU-AML-001`) n'existe jamais dans le corpus MSW, qui ne connaît que
 * les 2 régulations mockées d'origine. Voir `regulation-assignee-overrides.ts`.
 */
export function updateRegulationAssignee(id: string, assigneeId: string) {
  if (isBackendLive) {
    setRegulationAssigneeOverride(id, assigneeId);
    // Le retour ne sert qu'à satisfaire le type : l'appelant invalide la requête et
    // relit la liste juste après, qui appliquera l'override au prochain chargement.
    return backend.fetchDocumentDetail(id).then((doc) => ({ ...doc, assignee_id: assigneeId }));
  }
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
