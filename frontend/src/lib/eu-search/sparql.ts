import {
  euDocumentTypeSchema,
  type EuSearchParams,
  type EuSearchResponse,
  type EuSearchResult,
  type EuSubject,
} from "@/types/api";

/**
 * Construction de la requête SPARQL CELLAR et lecture de sa réponse — fonctions pures,
 * testées sans réseau. Aucune valeur saisie n'est interpolée brute : types, thèmes et
 * langues passent par des listes blanches, le mot-clé est réduit à des lettres/chiffres,
 * un CELEX n'est inséré qu'après validation par une expression stricte.
 */

export const EU_PAGE_SIZE = 20;

const RESOURCE_TYPE_PREFIX = "http://publications.europa.eu/resource/authority/resource-type/";
const LANGUAGE_PREFIX = "http://publications.europa.eu/resource/authority/language/";
const MAX_KEYWORD_WORDS = 8;
/** Secteur + année + type (1-2 lettres) + numéro, rectificatif `R(nn)` optionnel. */
const CELEX_PATTERN = /^\d{5}[A-Z]{1,2}\d{4}(R\(\d{2}\))?$/;

const LANGUAGE_CODES: Record<EuSearchParams["lang"], string> = { fr: "FRA", en: "ENG" };

/** IRI EuroVoc vérifiées dans CELLAR le 2026-09-15 (voir le spec, § 3). */
export const EUROVOC_SUBJECT_IRIS: Record<EuSubject, string> = {
  "money-laundering": "http://eurovoc.europa.eu/5465",
  "banking-supervision": "http://eurovoc.europa.eu/3251",
  "financial-services": "http://eurovoc.europa.eu/8469",
  "risk-management": "http://eurovoc.europa.eu/c_406ad4cc",
  outsourcing: "http://eurovoc.europa.eu/6913",
  "consumer-protection": "http://eurovoc.europa.eu/2836",
  "information-security": "http://eurovoc.europa.eu/c_04ae3ba8",
  payment: "http://eurovoc.europa.eu/2216",
};

/** Mot-clé → expression `bif:contains` (`'w1' AND 'w2'`), ou `null` s'il ne reste aucun mot. */
export function toBifContainsExpression(q: string | undefined): string | null {
  const words = (q ?? "").match(/[\p{L}\p{N}]+/gu)?.slice(0, MAX_KEYWORD_WORDS) ?? [];
  return words.length ? words.map((word) => `'${word}'`).join(" AND ") : null;
}

/** Saisie → numéro CELEX normalisé (`celex:32022r2554` → `32022R2554`), ou `null`. */
export function toCelex(q: string | undefined): string | null {
  const candidate = (q ?? "").trim().replace(/^CELEX:\s*/i, "").toUpperCase();
  return CELEX_PATTERN.test(candidate) ? candidate : null;
}

export function buildEuSearchQuery(params: EuSearchParams): string {
  const types = params.types.map((type) => `<${RESOURCE_TYPE_PREFIX}${type}>`).join(", ");
  const language = `<${LANGUAGE_PREFIX}${LANGUAGE_CODES[params.lang]}>`;
  // ponytail: CELEX exact seulement — la recherche par préfixe (STRSTARTS) prend ~8,6 s
  // sur CELLAR et remonte surtout des rectificatifs (mesuré le 2026-09-15).
  const celex = toCelex(params.q);
  const keyword = celex ? null : toBifContainsExpression(params.q);
  const selectedTitle = `?eSel cdm:expression_belongs_to_work ?work ; cdm:expression_uses_language ${language} ; cdm:expression_title ?tSel .`;

  const lines = [
    "PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>",
    "SELECT DISTINCT ?celex ?date ?type ?inForce (COALESCE(?tSel, ?tEng) AS ?title) WHERE {",
    celex ? `  ?work cdm:resource_legal_id_celex "${celex}"^^xsd:string .` : null,
    "  ?work cdm:resource_legal_id_celex ?celex ; cdm:work_date_document ?date ; cdm:work_has_resource-type ?type .",
    `  FILTER(?type IN (${types}))`,
    params.inForce === "true"
      ? '  ?work cdm:resource_legal_in-force ?inForce . FILTER(?inForce = "true"^^xsd:boolean)'
      : "  OPTIONAL { ?work cdm:resource_legal_in-force ?inForce }",
    params.subject
      ? `  ?work cdm:work_is_about_concept_eurovoc <${EUROVOC_SUBJECT_IRIS[params.subject]}> .`
      : null,
    params.from !== undefined ? `  FILTER(?date >= "${params.from}-01-01"^^xsd:date)` : null,
    params.to !== undefined ? `  FILTER(?date < "${params.to + 1}-01-01"^^xsd:date)` : null,
    keyword
      ? `  ${selectedTitle}\n  ?tSel bif:contains "${keyword}" .`
      : `  OPTIONAL { ${selectedTitle} }`,
    `  OPTIONAL { ?eEng cdm:expression_belongs_to_work ?work ; cdm:expression_uses_language <${LANGUAGE_PREFIX}ENG> ; cdm:expression_title ?tEng }`,
    "  FILTER(BOUND(?tSel) || BOUND(?tEng))",
    `} ORDER BY ${params.sort === "newest" ? "DESC" : "ASC"}(?date) ?celex`,
    `LIMIT ${EU_PAGE_SIZE + 1} OFFSET ${(params.page - 1) * EU_PAGE_SIZE}`,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

export type SparqlJson = {
  results: { bindings: Array<Record<string, { value: string } | undefined>> };
};

export function mapEuSearchBindings(json: SparqlJson, params: EuSearchParams): EuSearchResponse {
  const seen = new Set<string>();
  const rows: EuSearchResult[] = [];

  for (const row of json.results.bindings) {
    const celex = row.celex?.value;
    const title = row.title?.value;
    const date = row.date?.value;
    const type = euDocumentTypeSchema.safeParse(row.type?.value.replace(RESOURCE_TYPE_PREFIX, ""));
    // ponytail: CELEX dedupe et type/completeness filtering → page peut compter < 20
    // résultats (pas de perte), mais hasMore est toujours basé sur la fenêtre brute LIMIT 21.
    if (!celex || !title || !date || !type.success || seen.has(celex)) continue;
    seen.add(celex);
    rows.push({
      celex,
      title,
      date,
      type: type.data,
      inForce: row.inForce?.value === "1" || row.inForce?.value === "true",
      eurlexUrl: `https://eur-lex.europa.eu/legal-content/${params.lang.toUpperCase()}/TXT/?uri=CELEX:${celex}`,
    });
  }

  return {
    results: rows.slice(0, EU_PAGE_SIZE),
    page: params.page,
    hasMore: json.results.bindings.length > EU_PAGE_SIZE,
  };
}
