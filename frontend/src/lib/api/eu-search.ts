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
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = apiErrorSchema.safeParse(payload);
    throw error.success
      ? new ApiError(error.data.error.code, error.data.error.message, response.status)
      : new ApiError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
  }

  return euSearchResponseSchema.parse(payload);
}
