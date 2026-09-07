import { z } from "zod";

import { documentDetailSchema, documentMetaSchema } from "@/types/api";

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
