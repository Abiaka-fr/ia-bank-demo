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

/** Procédures internes = documents `INTERNAL` côté backend. */
export function fetchProcedures() {
  if (isBackendLive) return backend.fetchProcedures();
  return apiFetch("/api/procedures", z.array(documentMetaSchema));
}

export function fetchProcedure(id: string) {
  if (isBackendLive) return backend.fetchDocumentDetail(id);
  return apiFetch(`/api/procedures/${id}`, documentDetailSchema);
}

/**
 * Upload — v1.8, non couvert par le backend (aucune route `POST /api/procedures`),
 * toujours servi par MSW. Même règle que `uploadRegulation` : `.docx` uniquement.
 */
export function uploadProcedure(input: {
  file: File;
  assigneeId?: string;
  uploadedById?: string;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("file_name", input.file.name);
  if (input.assigneeId) formData.append("assignee_id", input.assigneeId);
  if (input.uploadedById) formData.append("uploaded_by_id", input.uploadedById);

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
