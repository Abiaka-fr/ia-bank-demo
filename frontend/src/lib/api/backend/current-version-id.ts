/**
 * ⚠️ CONTOURNEMENT TEMPORAIRE — à supprimer dès que le backend expose la version courante.
 *
 * `GET /api/documents/content/{version_id}` a besoin d'un `version_id`, mais **aucun
 * endpoint ne le renvoie** : ni `GET /api/documents`, ni `GET /api/documents/{id}`.
 * C'est la question ouverte n°1 de `docs/backend-integration.md`, et elle bloque
 * l'onglet « Texte source ».
 *
 * En attendant la revue avec Thư, on reconstruit l'identifiant à partir d'une
 * convention **vérifiée sur la base de référence** (2026-09-07) :
 *
 *   - `version_id` = `VER-{document_id}-{version_no sur 2 chiffres}` : vrai pour
 *     88 lignes sur 88 de `document_versions` ;
 *   - chacun des 32 documents a exactement une version `ACTIVE`, dont le `version_no`
 *     est égal à `documents.current_version` : vrai pour 32 documents sur 32.
 *
 * Ce fichier est isolé, et l'appel échoue **bruyamment** (404 -> `BackendGapError`)
 * plutôt que d'afficher un texte vide : si la convention change, on le voit tout de
 * suite au lieu de croire que le document n'a pas de contenu.
 *
 * Proposition à porter en revue : ajouter `current_version_id` à `DocumentRead`.
 * C'est un seul champ, la donnée est déjà en base.
 */

/** Une seule ligne à supprimer le jour où le backend renvoie l'identifiant. */
export function deriveCurrentVersionId(
  documentId: string,
  currentVersion: string | null | undefined,
): string | null {
  const versionNumber = Number.parseInt(currentVersion ?? "", 10);
  if (!Number.isFinite(versionNumber) || versionNumber <= 0) return null;
  return `VER-${documentId}-${String(versionNumber).padStart(2, "0")}`;
}
