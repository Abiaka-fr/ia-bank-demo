import { z } from "zod";

import { documentDetailSchema, documentMetaSchema } from "@/types/api";

import { apiFetch } from "./client";

export function fetchProcedures() {
  return apiFetch("/api/procedures", z.array(documentMetaSchema));
}

export function fetchProcedure(id: string) {
  return apiFetch(`/api/procedures/${id}`, documentDetailSchema);
}
