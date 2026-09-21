import { z } from "zod";

import {
  analyzeProcedureResponseSchema,
  documentDetailSchema,
  documentMetaSchema,
  type RegulatoryScope,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Préfixe des identifiants générés par `POST /api/procedures` (toujours simulé par
 * MSW, aucune route réelle — `docs/api-requests.md` #2/#8/#9). Même correctif que
 * `regulations.ts::MOCK_UPLOAD_ID_PREFIX` : sans lui, `fetchProcedure` sur
 * l'identifiant fraîchement créé interrogeait le vrai backend (qui ne le connaît pas)
 * et renvoyait « Resource not found » juste après l'upload.
 */
export const MOCK_UPLOAD_ID_PREFIX = "PROC-UP-";

/** Procédures internes = documents `INTERNAL` côté backend. */
export function fetchProcedures() {
  if (isBackendLive) return backend.fetchProcedures();
  return apiFetch("/api/procedures", z.array(documentMetaSchema));
}

export function fetchProcedure(id: string) {
  // Toujours créée par MSW (voir `MOCK_UPLOAD_ID_PREFIX`) : le backend réel ne la
  // connaîtra jamais, même quand il est branché.
  if (isBackendLive && !id.startsWith(MOCK_UPLOAD_ID_PREFIX)) {
    return backend.fetchDocumentDetail(id);
  }
  return apiFetch(`/api/procedures/${id}`, documentDetailSchema);
}

/**
 * v1.7/v1.8 — analyse Bank-first, Europe additive. Non couvert par le backend, servi
 * par MSW : un échec du service européen ne doit jamais faire échouer l'analyse Bank
 * (règle explicite de Francis), donc `scope` reste optionnel côté serveur mock.
 */
export function analyzeProcedure(id: string, scope?: RegulatoryScope) {
  return apiFetch(`/api/procedures/${id}/analyze`, analyzeProcedureResponseSchema, {
    method: "POST",
    body: scope ? { scope } : {},
  });
}
