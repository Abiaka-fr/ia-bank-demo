import { defineRouting } from "next-intl/routing";

/**
 * Bilingue FR/EN obligatoire (voir frontend/CLAUDE.md). Le français est la langue
 * par défaut, mais l'anglais est un citoyen de première classe, pas un fallback.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
