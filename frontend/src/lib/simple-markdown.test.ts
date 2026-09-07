import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdownLine } from "./simple-markdown";

describe("parseInline", () => {
  it("reconnaît le gras", () => {
    expect(parseInline("**Document ID:** PROC-AML-008")).toEqual([
      { text: "Document ID:", bold: true },
      { text: " PROC-AML-008" },
    ]);
  });

  it("reconnaît le code inline", () => {
    expect(parseInline("voir `REQ-0001`")).toEqual([
      { text: "voir " },
      { text: "REQ-0001", code: true },
    ]);
  });

  it("reconnaît l'italique avec * ou _", () => {
    expect(parseInline("*italique*")).toEqual([{ text: "italique", italic: true }]);
    expect(parseInline("_italique_")).toEqual([{ text: "italique", italic: true }]);
  });

  it("ne casse pas le gras en italique imbriqué", () => {
    expect(parseInline("**gras**")).toEqual([{ text: "gras", bold: true }]);
  });

  it("renvoie le texte tel quel sans marquage", () => {
    expect(parseInline("texte simple")).toEqual([{ text: "texte simple" }]);
  });
});

describe("parseMarkdownLine", () => {
  it("reconnaît un titre et son niveau", () => {
    expect(parseMarkdownLine("# EU AML/CFT Customer Due Diligence Demo Standard")).toEqual({
      type: "heading",
      level: 1,
      segments: [{ text: "EU AML/CFT Customer Due Diligence Demo Standard" }],
    });
    expect(parseMarkdownLine("## 1. Purpose and Scope")).toMatchObject({
      type: "heading",
      level: 2,
    });
  });

  it("reconnaît une citation", () => {
    expect(
      parseMarkdownLine("> **SYNTHETIC DEMO DOCUMENT** - Ceci n'est pas un vrai texte."),
    ).toMatchObject({ type: "blockquote" });
  });

  it("reconnaît un élément de liste, à puce ou numéroté", () => {
    expect(parseMarkdownLine("- Premier élément")).toMatchObject({ type: "listItem" });
    expect(parseMarkdownLine("1. Premier élément")).toMatchObject({ type: "listItem" });
  });

  it("traite une ligne vide comme telle", () => {
    expect(parseMarkdownLine("")).toEqual({ type: "empty" });
    expect(parseMarkdownLine("   ")).toEqual({ type: "empty" });
  });

  it("retombe sur un paragraphe pour tout le reste", () => {
    expect(parseMarkdownLine("**Version:** 2.0")).toEqual({
      type: "paragraph",
      segments: [
        { text: "Version:", bold: true },
        { text: " 2.0" },
      ],
    });
  });
});
