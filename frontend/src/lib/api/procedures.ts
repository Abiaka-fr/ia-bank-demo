import { z } from "zod";

import type { ExtractedChunk } from "@/lib/file-extract";
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
 * Upload — v1.8, non couvert par le backend (aucune route `POST /api/procedures`,
 * `docs/api-requests.md` #2/#8), toujours servi par MSW. Même règle que
 * `uploadRegulation` : `.docx`/`.xlsx` uniquement.
 */
export function uploadProcedure(input: {
  file: File;
  assigneeId?: string;
  uploadedById?: string;
  /** Contenu extrait côté client (demande de Thư, 2026-09-14) — voir `lib/file-extract.ts`. */
  chunks?: readonly ExtractedChunk[];
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("file_name", input.file.name);
  if (input.assigneeId) formData.append("assignee_id", input.assigneeId);
  if (input.uploadedById) formData.append("uploaded_by_id", input.uploadedById);
  if (input.chunks?.length) {
    formData.append("extracted_chunks", JSON.stringify(input.chunks));
  }

  return apiFetch("/api/procedures", documentMetaSchema, {
    method: "POST",
    formData,
  });
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
