/**
 * Client HTTP du backend réel de Thư.
 *
 * Distinct de `src/lib/api/client.ts` (qui parle le contrat et vise MSW) pour deux
 * raisons concrètes : le backend exige un JWT sur **toutes** les routes `/api/**`, et
 * il renvoie ses erreurs en `{detail}` là où le contrat prévoit `{error:{code,message}}`.
 * Mélanger les deux dans un seul client obligerait à accepter les deux formats partout.
 */
import { z } from "zod";

import { ApiContractError, ApiError } from "../client";
import { clearToken, readToken } from "../token";

import { BACKEND_URL } from "./config";
import { backendErrorSchema } from "./schemas";

/** Levée quand le backend ne couvre pas encore ce que l'écran demande. */
export class BackendGapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendGapError";
  }
}

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  /** Une clé peut apparaître plusieurs fois (ex. `document_ids`), d'où le tableau. */
  searchParams?: Record<string, string | string[] | undefined>;
  /** Routes d'authentification : pas de jeton à envoyer, on ne l'exige donc pas. */
  skipAuth?: boolean;
};

function buildUrl(path: string, searchParams: BackendRequestOptions["searchParams"]) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue;
    // `URLSearchParams.append` répété : c'est la forme que FastAPI attend pour une
    // liste (`?document_ids=A&document_ids=B`).
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== "") query.append(key, entry);
    }
  }
  const suffix = query.toString();
  return `${BACKEND_URL}${path}${suffix ? `?${suffix}` : ""}`;
}

/** Traduit `{detail: "..."}` vers l'`ApiError` que les écrans savent déjà afficher. */
async function readBackendError(response: Response): Promise<ApiError> {
  // 401 : jeton absent, invalide ou expiré (60 min). On le purge pour que la garde de
  // session renvoie vers l'écran de connexion au lieu de boucler sur des 401.
  if (response.status === 401) {
    clearToken();
    return new ApiError("UNAUTHENTICATED", "Session expirée", 401);
  }

  try {
    const parsed = backendErrorSchema.safeParse(await response.json());
    if (parsed.success && typeof parsed.data.detail === "string") {
      return new ApiError("BACKEND_ERROR", parsed.data.detail, response.status);
    }
  } catch {
    // Corps illisible : erreur générique ci-dessous.
  }
  return new ApiError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
}

/**
 * Appelle le backend réel et valide la réponse contre le schéma **backend** fourni
 * (`./schemas.ts`), jamais contre un schéma du contrat : la traduction vers le contrat
 * a lieu ensuite, dans `./adapt.ts`.
 */
export async function backendFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options: BackendRequestOptions = {},
): Promise<z.infer<TSchema>> {
  const { method = "GET", body, searchParams, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!skipAuth) {
    const token = readToken();
    if (!token) {
      throw new ApiError("UNAUTHENTICATED", "Aucune session active", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, searchParams), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw await readBackendError(response);

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    // Même règle qu'en mode mock : on ne relâche pas le schéma pour faire passer une
    // réponse. Un échec ici signale que `backend/API.md` a bougé.
    throw new ApiContractError(
      path,
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`,
      ),
    );
  }

  return parsed.data;
}
