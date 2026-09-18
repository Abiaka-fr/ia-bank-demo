import { apiErrorSchema, euSearchResponseSchema, type EuSearchParams } from "@/types/api";

import { ApiError } from "./client";

/**
 * Appelle la route Next `/api/eu-search` (même origine). Pas `apiFetch` : celui-ci
 * préfixe l'URL du backend de Thư, alors que cette route vit dans le frontend.
 */
export async function fetchEuSearch(params: EuSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }

  const response = await fetch(`/api/eu-search?${query}`);
  if (!response.ok) throw await toApiError(response);
  return euSearchResponseSchema.parse(await response.json());
}

/** Texte intégral HTML d'un acte (route `/api/eu-document`), pour l'iframe du lecteur. */
export async function fetchEuDocumentHtml(celex: string, lang: "fr" | "en") {
  const response = await fetch(euDocumentUrl(celex, lang, "html"));
  if (!response.ok) throw await toApiError(response);
  return response.text();
}

export function euDocumentUrl(celex: string, lang: "fr" | "en", format: "html" | "docx") {
  return `/api/eu-document?${new URLSearchParams({ celex, lang, format })}`;
}

async function toApiError(response: Response) {
  const error = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return error.success
    ? new ApiError(error.data.error.code, error.data.error.message, response.status)
    : new ApiError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
}
