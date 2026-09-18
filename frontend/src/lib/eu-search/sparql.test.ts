import { describe, expect, it } from "vitest";

import { euSearchParamsSchema, type EuSearchParams } from "@/types/api";

import {
  EU_PAGE_SIZE,
  buildEuSearchQuery,
  mapEuSearchBindings,
  toBifContainsExpression,
  toCelex,
  type SparqlJson,
} from "./sparql";

const REG_IRI = "http://publications.europa.eu/resource/authority/resource-type/REG";

function params(overrides: Record<string, unknown> = {}): EuSearchParams {
  return euSearchParamsSchema.parse(overrides);
}

function binding(celex: string, extra: Record<string, string> = {}) {
  const values: Record<string, string> = {
    celex,
    title: `Titre ${celex}`,
    date: "2024-05-31",
    type: REG_IRI,
    inForce: "1",
    ...extra,
  };
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { value }]),
  );
}

function json(bindings: SparqlJson["results"]["bindings"]): SparqlJson {
  return { results: { bindings } };
}

describe("euSearchParamsSchema", () => {
  it("applique les valeurs par défaut", () => {
    // Arrange / Act
    const parsed = euSearchParamsSchema.parse({});

    // Assert
    expect(parsed).toEqual({
      types: ["REG", "DIR"],
      inForce: "true",
      sort: "newest",
      page: 1,
      lang: "fr",
    });
  });

  it("convertit les paramètres d'URL reçus en chaînes", () => {
    // Arrange / Act
    const parsed = euSearchParamsSchema.parse({
      page: "3",
      from: "2015",
      to: "2020",
      types: "DEC,RECO",
    });

    // Assert
    expect(parsed.page).toBe(3);
    expect(parsed.from).toBe(2015);
    expect(parsed.to).toBe(2020);
    expect(parsed.types).toEqual(["DEC", "RECO"]);
  });

  it("rejette les valeurs hors liste blanche ou hors bornes", () => {
    // Arrange
    const invalidInputs = [
      { types: "FOO" },
      { types: "" },
      { types: "REG,DIR,DEC,RECO,REG" },
      { subject: "unknown" },
      { page: "51" },
      { page: "0" },
      { from: "1900" },
      { from: "2020", to: "2015" },
      { q: "a".repeat(101) },
      { lang: "de" },
      { inForce: "false" },
    ];

    // Act / Assert
    for (const input of invalidInputs) {
      expect(euSearchParamsSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});

describe("toBifContainsExpression", () => {
  it("garde chaque mot entre apostrophes, joints par AND", () => {
    // Arrange / Act / Assert
    expect(toBifContainsExpression("blanchiment d'argent")).toBe(
      "'blanchiment' AND 'd' AND 'argent'",
    );
    expect(toBifContainsExpression("sécurité  informatique")).toBe(
      "'sécurité' AND 'informatique'",
    );
  });

  it("supprime tout caractère capable de sortir de la chaîne SPARQL", () => {
    // Arrange
    const injection = 'x" } ; DROP #';

    // Act
    const expression = toBifContainsExpression(injection);

    // Assert
    expect(expression).toBe("'x' AND 'DROP'");
  });

  it("limite à 8 mots", () => {
    // Arrange / Act
    const expression = toBifContainsExpression(
      "un deux trois quatre cinq six sept huit neuf dix",
    );

    // Assert
    expect(expression?.split(" AND ")).toHaveLength(8);
    expect(expression?.endsWith("'huit'")).toBe(true);
  });

  it("renvoie null quand il ne reste aucun mot", () => {
    // Arrange / Act / Assert
    expect(toBifContainsExpression(undefined)).toBeNull();
    expect(toBifContainsExpression("")).toBeNull();
    expect(toBifContainsExpression("  !!! ")).toBeNull();
  });
});

describe("toCelex", () => {
  it("reconnaît un numéro CELEX, avec ou sans préfixe, en minuscules ou rectificatif", () => {
    // Arrange / Act / Assert
    expect(toCelex("32022R2554")).toBe("32022R2554");
    expect(toCelex("  celex:32022r2554 ")).toBe("32022R2554");
    expect(toCelex("CELEX: 32015L0849")).toBe("32015L0849");
    expect(toCelex("52016PC0450")).toBe("52016PC0450");
    expect(toCelex("32022R2554R(07)")).toBe("32022R2554R(07)");
  });

  it("renvoie null pour un mot-clé, un préfixe ou un CELEX suivi de caractères", () => {
    // Arrange / Act / Assert
    expect(toCelex(undefined)).toBeNull();
    expect(toCelex("blanchiment")).toBeNull();
    expect(toCelex("32022R25")).toBeNull();
    expect(toCelex('32022R2554" } ; DROP #')).toBeNull();
  });
});

describe("buildEuSearchQuery", () => {
  it("construit la requête par défaut (REG+DIR en vigueur, titre FR, plus récents)", () => {
    // Arrange / Act
    const query = buildEuSearchQuery(params());

    // Assert
    expect(query).toContain(
      `FILTER(?type IN (<${REG_IRI}>, <http://publications.europa.eu/resource/authority/resource-type/DIR>))`,
    );
    expect(query).toContain('FILTER(?inForce = "true"^^xsd:boolean)');
    expect(query).toContain(
      "OPTIONAL { ?eSel cdm:expression_belongs_to_work ?work ; cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/FRA>",
    );
    expect(query).not.toContain("bif:contains");
    expect(query).not.toContain("eurovoc");
    expect(query).not.toContain('"^^xsd:string');
    expect(query).toContain("ORDER BY DESC(?date) ?celex");
    expect(query).toContain("LIMIT 21 OFFSET 0");
  });

  it("traduit chaque filtre en clause SPARQL", () => {
    // Arrange / Act / Assert
    const dec = buildEuSearchQuery(params({ types: "DEC" }));
    expect(dec).toContain("resource-type/DEC>");
    expect(dec).not.toContain("resource-type/REG>");

    const decReco = buildEuSearchQuery(params({ types: "DEC,RECO" }));
    expect(decReco).toContain(
      "FILTER(?type IN (<http://publications.europa.eu/resource/authority/resource-type/DEC>, <http://publications.europa.eu/resource/authority/resource-type/RECO>))",
    );

    expect(buildEuSearchQuery(params({ subject: "money-laundering" }))).toContain(
      "?work cdm:work_is_about_concept_eurovoc <http://eurovoc.europa.eu/5465> .",
    );

    const years = buildEuSearchQuery(params({ from: 2015, to: 2020 }));
    expect(years).toContain('FILTER(?date >= "2015-01-01"^^xsd:date)');
    expect(years).toContain('FILTER(?date < "2021-01-01"^^xsd:date)');

    const all = buildEuSearchQuery(params({ inForce: "all" }));
    expect(all).toContain("OPTIONAL { ?work cdm:resource_legal_in-force ?inForce }");
    expect(all).not.toContain('"true"^^xsd:boolean');

    expect(buildEuSearchQuery(params({ sort: "oldest" }))).toContain("ORDER BY ASC(?date) ?celex");
    expect(buildEuSearchQuery(params({ page: 3 }))).toContain("LIMIT 21 OFFSET 40");
    expect(buildEuSearchQuery(params({ lang: "en" }))).toContain(
      "?eSel cdm:expression_belongs_to_work ?work ; cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG>",
    );
  });

  it("exige un titre dans la langue choisie quand un mot-clé est fourni", () => {
    // Arrange / Act
    const query = buildEuSearchQuery(params({ q: "blanchiment" }));

    // Assert
    expect(query).toContain(`?tSel bif:contains "'blanchiment'" .`);
    expect(query).not.toContain("OPTIONAL { ?eSel");
  });

  it("cherche le CELEX exact au lieu du titre, en gardant les autres filtres", () => {
    // Arrange / Act
    const query = buildEuSearchQuery(params({ q: "celex:32005l0060", subject: "money-laundering" }));

    // Assert
    expect(query).toContain('?work cdm:resource_legal_id_celex "32005L0060"^^xsd:string .');
    expect(query).not.toContain("bif:contains");
    expect(query).toContain("OPTIONAL { ?eSel");
    expect(query).toContain(`FILTER(?type IN (<${REG_IRI}>,`);
    expect(query).toContain('FILTER(?inForce = "true"^^xsd:boolean)');
    expect(query).toContain("cdm:work_is_about_concept_eurovoc <http://eurovoc.europa.eu/5465>");
  });

  it("n'insère jamais le mot-clé brut dans la requête", () => {
    // Arrange / Act
    const query = buildEuSearchQuery(params({ q: 'x" } ; DROP #' }));

    // Assert
    expect(query).toContain(`?tSel bif:contains "'x' AND 'DROP'" .`);
    expect(query).not.toContain("DROP #");
    expect(query).not.toContain('x"');
  });
});

describe("mapEuSearchBindings", () => {
  it("renvoie 20 résultats et hasMore quand CELLAR renvoie 21 lignes", () => {
    // Arrange
    const rows = Array.from({ length: EU_PAGE_SIZE + 1 }, (_, index) =>
      binding(`32024R${String(index).padStart(4, "0")}`),
    );

    // Act
    const response = mapEuSearchBindings(json(rows), params({ page: 2 }));

    // Assert
    expect(response.results).toHaveLength(EU_PAGE_SIZE);
    expect(response.hasMore).toBe(true);
    expect(response.page).toBe(2);
  });

  it("renvoie hasMore false quand la page n'est pas pleine", () => {
    // Arrange / Act
    const response = mapEuSearchBindings(json([binding("32022R2554")]), params());

    // Assert
    expect(response.hasMore).toBe(false);
  });

  it("mappe chaque champ et construit le lien EUR-Lex dans la langue choisie", () => {
    // Arrange
    const withoutInForce = binding("32015L0849");
    delete withoutInForce.inForce;

    // Act
    const fr = mapEuSearchBindings(json([binding("32022R2554")]), params());
    const en = mapEuSearchBindings(
      json([binding("32022R2554", { inForce: "true" }), withoutInForce]),
      params({ lang: "en" }),
    );

    // Assert
    expect(fr.results[0]).toEqual({
      celex: "32022R2554",
      title: "Titre 32022R2554",
      date: "2024-05-31",
      type: "REG",
      inForce: true,
      eurlexUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554",
    });
    expect(en.results[0]?.inForce).toBe(true);
    expect(en.results[0]?.eurlexUrl).toBe(
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554",
    );
    expect(en.results[1]?.inForce).toBe(false);
  });

  it("ignore les doublons de CELEX, les types hors liste et les lignes incomplètes", () => {
    // Arrange
    const rows = [
      binding("A"),
      binding("A", { title: "Autre titre" }),
      binding("B", {
        type: "http://publications.europa.eu/resource/authority/resource-type/REG_IMPL",
      }),
      { celex: { value: "C" } },
    ];

    // Act
    const response = mapEuSearchBindings(json(rows), params());

    // Assert
    expect(response.results.map((result) => result.celex)).toEqual(["A"]);
  });

  it("garde hasMore quand la fenêtre de 21 lignes contient un doublon", () => {
    // Arrange: 21 raw bindings, but two share the same CELEX → 20 unique after dedup
    const rows = Array.from({ length: EU_PAGE_SIZE + 1 }, (_, index) => {
      if (index === 10) {
        // Duplicate the first one's CELEX
        return binding(`32024R0000`);
      }
      return binding(`32024R${String(index).padStart(4, "0")}`);
    });

    // Act
    const response = mapEuSearchBindings(json(rows), params());

    // Assert
    expect(response.results).toHaveLength(EU_PAGE_SIZE);
    expect(response.hasMore).toBe(true);
  });
});
