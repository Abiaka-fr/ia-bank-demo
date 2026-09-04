import { z } from "zod";

import {
  documentDetailSchema,
  documentMetaSchema,
  requirementSchema,
} from "@/types/api";

import { apiFetch } from "./client";

export function fetchRegulations() {
  return apiFetch("/api/regulations", z.array(documentMetaSchema));
}

export function fetchRegulation(id: string) {
  return apiFetch(`/api/regulations/${id}`, documentDetailSchema);
}

export function fetchRegulationRequirements(id: string) {
  return apiFetch(
    `/api/regulations/${id}/requirements`,
    z.array(requirementSchema),
  );
}

export function analyzeRegulation(id: string) {
  return apiFetch(
    `/api/regulations/${id}/analyze`,
    z.object({ status: z.literal("ANALYZING") }),
    { method: "POST" },
  );
}
