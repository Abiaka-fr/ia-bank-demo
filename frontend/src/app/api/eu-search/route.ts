import { type NextRequest, NextResponse } from "next/server";

import { buildEuSearchQuery, mapEuSearchBindings, type SparqlJson } from "@/lib/eu-search/sparql";
import { euSearchParamsSchema } from "@/types/api";

/**
 * Proxy de recherche de métadonnées CELLAR. Nécessaire côté serveur : l'endpoint SPARQL
 * ne renvoie aucun en-tête CORS, le navigateur ne peut pas l'appeler directement.
 */
const CELLAR_SPARQL_URL = "https://publications.europa.eu/webapi/rdf/sparql";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: NextRequest) {
  const parsed = euSearchParamsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ");
    return errorResponse(400, "INVALID_PARAMS", message);
  }

  const url = `${CELLAR_SPARQL_URL}?${new URLSearchParams({ query: buildEuSearchQuery(parsed.data) })}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/sparql-results+json" },
      // ponytail: cache 1 h par requête — aucune limite de débit officielle publiée par
      // CELLAR (vérifié 2026-09-15) ; réduire si les textes du jour doivent apparaître.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return errorResponse(502, "EU_SOURCE_UNAVAILABLE", `CELLAR HTTP ${response.status}`);
    }
    const json = (await response.json()) as SparqlJson;
    return NextResponse.json(mapEuSearchBindings(json, parsed.data));
  } catch {
    // Timeout, réseau, ou réponse illisible (json.results absent → TypeError dans le mapping).
    return errorResponse(502, "EU_SOURCE_UNAVAILABLE", "CELLAR unreachable or invalid response");
  }
}
