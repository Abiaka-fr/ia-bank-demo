import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { htmlToDocx } from "@/lib/eu-search/docx";
import { toCelex } from "@/lib/eu-search/sparql";

/**
 * Texte intégral d'un acte européen, lu dans CELLAR par négociation de contenu.
 * Côté serveur : ni CELLAR (pas de CORS) ni EUR-Lex (`X-Frame-Options: SAMEORIGIN`)
 * ne peuvent être lus ou intégrés depuis le navigateur. Aucun .docx n'est publié par
 * CELLAR (vérifié le 2026-09-17) : `format=docx` emballe le HTML (voir `htmlToDocx`).
 */
const CELLAR_CELEX_URL = "https://publications.europa.eu/resource/celex/";

const paramsSchema = z.object({
  celex: z.string().transform((value, ctx) => {
    const celex = toCelex(value);
    if (!celex) ctx.addIssue({ code: "custom", message: "invalid CELEX number" });
    return celex ?? z.NEVER;
  }),
  lang: z.enum(["fr", "en"]).default("fr"),
  format: z.enum(["html", "docx"]).default("html"),
});

// Langue de l'interface d'abord, l'autre en repli si l'acte n'existe pas dans celle-ci.
const ACCEPT_LANGUAGE = { fr: "fra, eng;q=0.5", en: "eng, fra;q=0.5" } as const;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: NextRequest) {
  const parsed = paramsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return errorResponse(400, "INVALID_PARAMS", parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { celex, lang, format } = parsed.data;

  try {
    const upstream = await fetch(`${CELLAR_CELEX_URL}${celex}`, {
      headers: {
        // Actes récents en XHTML, anciens en HTML seulement.
        Accept: "application/xhtml+xml, text/html;q=0.9",
        "Accept-Language": ACCEPT_LANGUAGE[lang],
      },
      // Pas le cache de données Next : il ignore les réponses > 2 Mo (CRR ≈ 6,6 Mo).
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (upstream.status === 404) {
      return errorResponse(404, "EU_DOCUMENT_NOT_FOUND", `No text in CELLAR for ${celex}`);
    }
    if (!upstream.ok || !upstream.body) {
      return errorResponse(502, "EU_SOURCE_UNAVAILABLE", `CELLAR HTTP ${upstream.status}`);
    }

    const headers = { "Cache-Control": "public, max-age=86400" };
    if (format === "docx") {
      const docx = htmlToDocx(await upstream.text());
      return new Response(new Uint8Array(docx), {
        headers: {
          ...headers,
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${celex}_${lang.toUpperCase()}.docx"`,
        },
      });
    }

    // Transmis en flux, sans mise en mémoire. HTML tiers : bac à sable CSP si la route est
    // ouverte directement ; dans l'app, l'iframe `sandbox` ajoute la même isolation.
    return new Response(upstream.body, {
      headers: {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      },
    });
  } catch (error) {
    console.error("eu-document: CELLAR call failed", error);
    return errorResponse(502, "EU_SOURCE_UNAVAILABLE", "CELLAR unreachable");
  }
}
