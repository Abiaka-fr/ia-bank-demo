/**
 * Localise, dans le texte intégral d'un document, les passages cités par un extrait
 * de preuve — afin de les surligner et d'y faire défiler la vue.
 *
 * Un `EvidenceRef.excerpt` est repris mot pour mot du document source, mais il peut
 * agréger plusieurs passages non contigus, séparés par « […] ». On compare donc dans
 * les deux sens : un passage du document peut être contenu dans l'extrait, et
 * inversement.
 */

import type { EvidenceRef } from "@/types/api";

export type HighlightSegment = {
  text: string;
  isMatch: boolean;
};

/** En dessous, un fragment est trop court pour distinguer deux passages. */
const MIN_FRAGMENT_LENGTH = 25;
/** Longueur du début de chaîne utilisée comme sonde de correspondance. */
const PROBE_LENGTH = 60;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Retire la numérotation de liste (« 3. ») qui n'est pas reprise dans l'extrait. */
function stripListPrefix(line: string): string {
  return line.replace(/^\s*\d+\.\s*/, "");
}

function splitExcerptFragments(excerpt: string): string[] {
  return excerpt
    .split(/\[\s*…\s*\]|\[\s*\.\.\.\s*\]/)
    .map(normalize)
    .filter((fragment) => fragment.length >= MIN_FRAGMENT_LENGTH);
}

function probe(value: string): string {
  return value.slice(0, PROBE_LENGTH);
}

/**
 * Indices (dans `text.split("\n")`) des lignes citées par l'extrait.
 * Renvoie un ensemble vide si aucune correspondance n'est trouvée — l'appelant
 * affiche alors le document sans surlignage plutôt qu'un faux positif.
 */
export function findQuotedLineIndexes(
  text: string,
  excerpt: string,
): ReadonlySet<number> {
  const fragments = splitExcerptFragments(excerpt);
  if (fragments.length === 0) return new Set();

  const matched = new Set<number>();

  text.split("\n").forEach((rawLine, index) => {
    const line = normalize(stripListPrefix(rawLine));
    if (line.length < MIN_FRAGMENT_LENGTH) return;

    const isQuoted = fragments.some(
      (fragment) =>
        fragment.includes(probe(line)) || line.includes(probe(fragment)),
    );

    if (isQuoted) matched.add(index);
  });

  return matched;
}

/**
 * Highlight evidence excerpts in content via substring matching.
 * Returns segments with match flags for rendering.
 */
export function highlightSegments(
  content: string,
  evidence: readonly EvidenceRef[],
): HighlightSegment[] {
  if (!content || evidence.length === 0) {
    return [{ text: content, isMatch: false }];
  }

  const excerptMap = new Map<string, EvidenceRef>();
  evidence.forEach((ref) => {
    if (ref.excerpt?.trim()) {
      excerptMap.set(ref.excerpt.trim().toLowerCase(), ref);
    }
  });

  if (excerptMap.size === 0) {
    return [{ text: content, isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  const sortedExcerpts = Array.from(excerptMap.keys()).sort(
    (a, b) => b.length - a.length,
  );

  const contentLower = content.toLowerCase();
  const replacements: Array<{ start: number; end: number }> = [];

  sortedExcerpts.forEach((excerpt) => {
    let index = 0;
    while ((index = contentLower.indexOf(excerpt, index)) !== -1) {
      const overlaps = replacements.some(
        (r) => index < r.end && index + excerpt.length > r.start,
      );
      if (!overlaps) {
        replacements.push({
          start: index,
          end: index + excerpt.length,
        });
      }
      index += 1;
    }
  });

  replacements.sort((a, b) => a.start - b.start);

  replacements.forEach((replacement) => {
    if (lastIndex < replacement.start) {
      segments.push({
        text: content.substring(lastIndex, replacement.start),
        isMatch: false,
      });
    }
    segments.push({
      text: content.substring(replacement.start, replacement.end),
      isMatch: true,
    });
    lastIndex = replacement.end;
  });

  if (lastIndex < content.length) {
    segments.push({
      text: content.substring(lastIndex),
      isMatch: false,
    });
  }

  return segments.length > 0 ? segments : [{ text: content, isMatch: false }];
}
