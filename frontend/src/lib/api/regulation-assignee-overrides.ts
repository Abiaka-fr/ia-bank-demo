/**
 * Assignation « Personne en charge » d'une régulation, en mode backend réel.
 *
 * Ni le backend de Thư (aucun champ `assignee_id` sur un document) ni le corpus MSW
 * (limité aux 2 régulations mockées d'origine, jamais aux documents réels comme
 * `EXT-EU-AML-001`) ne peuvent porter cette assignation pour un document venu du
 * backend réel. Sans ce fichier, `PATCH /api/regulations/:id` en mode réel tombait sur
 * le handler MSW, qui cherchait la régulation dans son propre corpus mocké, ne la
 * trouvait jamais, et renvoyait 404 — l'assignation semblait toujours échouer.
 *
 * Purement local au navigateur (`sessionStorage`, même portée que le reste du mock) :
 * ce n'est pas une vraie persistance serveur, juste ce qui évite un 404 systématique
 * en attendant que le backend expose ce champ. Voir `docs/known-limitations.md`.
 */
const KEY = "ia-bank.regulation-assignee-overrides";

function read(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(value: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Sans persistance, l'override reste valable jusqu'au rechargement.
  }
}

let overrides: Record<string, string> = read();

export function getRegulationAssigneeOverride(
  regulationId: string,
): string | undefined {
  return overrides[regulationId];
}

export function setRegulationAssigneeOverride(
  regulationId: string,
  assigneeId: string,
): void {
  overrides = { ...overrides, [regulationId]: assigneeId };
  write(overrides);
}
