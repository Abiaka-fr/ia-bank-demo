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

/** Upload d'une régulation — `.docx` uniquement (validé aussi côté serveur). */
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

export function updateRegulationAssignee(id: string, assigneeId: string) {
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
