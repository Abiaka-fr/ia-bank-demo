/**
 * Localise, dans le texte intégral d'un document, les passages cités par un extrait
 * de preuve — afin de les surligner et d'y faire défiler la vue.
 *
 * Un `EvidenceRef.excerpt` est repris mot pour mot du document source, mais il peut
 * agréger plusieurs passages non contigus, séparés par « […] ». On compare donc dans
 * les deux sens : un passage du document peut être contenu dans l'extrait, et
 * inversement.
 */

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
