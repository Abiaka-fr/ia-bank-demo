import { describe, expect, it } from "vitest";

import { findQuotedLineIndexes, highlightSegments } from "./evidence-match";

describe("findQuotedLineIndexes", () => {
  it("ignore la numérotation de liste absente de l'extrait", () => {
    const text = "1. Première ligne suffisamment longue pour être distinguée.";
    const excerpt = "Première ligne suffisamment longue pour être distinguée.";

    expect(findQuotedLineIndexes(text, excerpt).size).toBe(1);
  });

  it("ne renvoie rien quand l'extrait ne figure pas dans le document", () => {
    const text = "Texte du document qui ne contient pas l'extrait cherché.";

    expect(
      findQuotedLineIndexes(text, "Un texte totalement étranger au document indexé.")
        .size,
    ).toBe(0);
  });

  it("ne renvoie rien pour un extrait trop court pour être discriminant", () => {
    expect(findQuotedLineIndexes("La Banque effectue ses opérations", "La Banque").size).toBe(0);
  });
});

describe("highlightSegments", () => {
  it("surligne un extrait multi-lignes en \\n dans un texte source en \\r\\n", () => {
    const content =
      "2.2 Ongoing Transaction Monitoring\r\n\r\nHigh-risk customers shall be subject to enhanced transaction\r\nmonitoring.\r\n\r\n2.3 Next";
    const excerpt =
      "2.2 Ongoing Transaction Monitoring\n\nHigh-risk customers shall be subject to enhanced transaction\nmonitoring.";
    const segments = highlightSegments(content, [
      { document_id: "EXT", document_title: "", section_reference: "", excerpt, language: "EN" },
    ]);
    const matched = segments.filter((segment) => segment.isMatch);
    expect(matched).toHaveLength(1);
    expect(matched[0].text).toBe(content.slice(0, content.indexOf("\r\n\r\n2.3")));
    expect(segments.map((segment) => segment.text).join("")).toBe(content);
  });

  it("surligne les phrases intactes même si le LLM a altéré une autre phrase", () => {
    const content =
      "Member States shall require self-regulatory bodies to report annually. They shall act with honesty and integrity at all times.";
    // Tiret insécable (U+2011) + mots sautés dans la 2e phrase — cas réels du backend.
    const excerpt =
      "Member States shall require self\u2011regulatory bodies to report annually. They shall act with integrity always.";
    const matched = highlightSegments(content, [
      { document_id: "EXT", document_title: "", section_reference: "", excerpt, language: "EN" },
    ]).filter((segment) => segment.isMatch);
    expect(matched.map((segment) => segment.text)).toEqual([
      "Member States shall require self-regulatory bodies to report annually.",
    ]);
  });
});
