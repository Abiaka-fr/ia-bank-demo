/**
 * Choisit la variante d'un texte généré par le backend (`Finding.explanation`,
 * `recommended_action`) à afficher selon la langue de l'interface.
 *
 * Le backend ne traduit que vers le français (`explanation_lang_fr`,
 * `recommended_action_lang_fr`, v1.6) — l'anglais reste la langue d'origine du corpus,
 * il n'y a jamais de variante `_en` distincte. En mode mock, ces variantes n'existent
 * pas : le texte principal est déjà en français dans le corpus de démo, donc retomber
 * dessus en interface anglaise reproduit une limite déjà connue et documentée
 * (`docs/known-limitations.md`), pas une régression introduite ici.
 */
export function pickLocalizedText(
  locale: string,
  primary: string,
  frVariant: string | undefined,
): string {
  return locale === "fr" && frVariant ? frVariant : primary;
}
