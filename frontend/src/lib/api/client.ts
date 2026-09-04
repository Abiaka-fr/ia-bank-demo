import type { z } from "zod";

import { apiErrorSchema } from "@/types/api";

/**
 * Base URL de l'API. Vide par défaut : les requêtes partent en relatif et sont
 * interceptées par MSW tant que le backend de Thư n'est pas disponible.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Erreur levée quand la réponse ne correspond pas à `docs/api-contract.md`. */
export class ApiContractError extends Error {
  constructor(
    readonly path: string,
    readonly issues: string[],
  ) {
    super(`Réponse non conforme au contrat d'API pour ${path}`);
    this.name = "ApiContractError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  searchParams?: Record<string, string | undefined>;
};

function buildUrl(path: string, searchParams?: RequestOptions["searchParams"]) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  const suffix = query.toString();
  return `${API_BASE_URL}${path}${suffix ? `?${suffix}` : ""}`;
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const parsed = apiErrorSchema.safeParse(await response.json());
    if (parsed.success) {
      return new ApiError(
        parsed.data.error.code,
        parsed.data.error.message,
        response.status,
      );
    }
  } catch {
    // Corps illisible : on retombe sur une erreur générique ci-dessous.
  }
  return new ApiError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
}

/**
 * Effectue un appel API et valide la réponse contre le schéma Zod fourni.
 * Toute réponse non conforme lève une `ApiContractError` plutôt que d'être
 * propagée silencieusement dans l'UI.
 */
export async function apiFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  const { method = "GET", body, searchParams } = options;

  const response = await fetch(buildUrl(path, searchParams), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw await readError(response);

  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiContractError(
      path,
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`,
      ),
    );
  }

  return parsed.data;
}
