/**
 * Rendu markdown minimal, ligne par ligne — pas une conversion complète en HTML.
 *
 * Le corpus (régulations et procédures) est écrit en Markdown simple (titres, gras,
 * italique, code, listes, citations) : `# Titre`, `**gras**`, `> citation`. Jusqu'ici
 * ces caractères s'affichaient tels quels dans l'interface. Ce module les interprète
 * pour l'affichage, **sans jamais changer le texte source lui-même** — la localisation
 * d'un passage cité (`evidence-match.ts`) continue de comparer le texte brut, ligne par
 * ligne : seule la présentation change, jamais la correspondance.
 *
 * Volontairement limité (pas de liens, pas de tableaux, pas de markdown imbriqué sur
 * plusieurs lignes) : le corpus de démo n'en a pas besoin, et un vrai moteur markdown
 * serait une dépendance disproportionnée pour ce besoin d'affichage.
 */

export type InlineSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type MarkdownLineNode =
  | { type: "empty" }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; segments: InlineSegment[] }
  | { type: "blockquote"; segments: InlineSegment[] }
  | { type: "listItem"; segments: InlineSegment[] }
  | { type: "paragraph"; segments: InlineSegment[] };

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const BLOCKQUOTE_PATTERN = /^>\s?(.*)$/;
const LIST_ITEM_PATTERN = /^(?:[-*]|\d+\.)\s+(.*)$/;
/** `**gras**`, `` `code` ``, `*italique*` ou `_italique_` — dans cet ordre pour que
 * `**` ne soit jamais lu comme deux `*` italiques imbriqués. */
const INLINE_TOKEN_PATTERN = /(\*\*.+?\*\*|`.+?`|\*.+?\*|_.+?_)/;

/** Découpe une ligne déjà identifiée comme du texte en segments gras/italique/code. */
export function parseInline(text: string): InlineSegment[] {
  const parts = text.split(INLINE_TOKEN_PATTERN).filter((part) => part !== "");

  return parts.map((part): InlineSegment => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return { text: part.slice(2, -2), bold: true };
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return { text: part.slice(1, -1), code: true };
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      if (part.length >= 2) return { text: part.slice(1, -1), italic: true };
    }
    return { text: part };
  });
}

/** Identifie le type d'une ligne (titre / citation / liste / paragraphe / vide). */
export function parseMarkdownLine(line: string): MarkdownLineNode {
  if (line.trim() === "") return { type: "empty" };

  const heading = HEADING_PATTERN.exec(line);
  if (heading) {
    return {
      type: "heading",
      level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
      segments: parseInline(heading[2]),
    };
  }

  const blockquote = BLOCKQUOTE_PATTERN.exec(line);
  if (blockquote) {
    return { type: "blockquote", segments: parseInline(blockquote[1]) };
  }

  const listItem = LIST_ITEM_PATTERN.exec(line);
  if (listItem) {
    return { type: "listItem", segments: parseInline(listItem[1]) };
  }

  return { type: "paragraph", segments: parseInline(line) };
}
