import { describe, expect, it } from "vitest";

import en from "./en.json";
import fr from "./fr.json";

/**
 * Garde-fou du bilingue : une clé présente dans un seul fichier est un bug, pas un
 * détail (voir frontend/CLAUDE.md § Bilingue).
 */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionnaires next-intl", () => {
  const frKeys = flattenKeys(fr).sort();
  const enKeys = flattenKeys(en).sort();

  it("expose exactement les mêmes clés en FR et en EN", () => {
    expect(frKeys).toEqual(enKeys);
  });

  it("ne laisse aucune traduction vide", () => {
    const emptyValues = [
      ...Object.entries({ fr, en }),
    ].flatMap(([locale, dictionary]) =>
      flattenKeys(dictionary)
        .filter((key) => {
          const value = key
            .split(".")
            .reduce<unknown>(
              (node, segment) => (node as Record<string, unknown>)[segment],
              dictionary,
            );
          // `impact.columnAction` est volontairement vide : colonne d'actions sans titre.
          return typeof value === "string" && value.trim() === "" &&
            key !== "impact.columnAction";
        })
        .map((key) => `${locale}:${key}`),
    );

    expect(emptyValues).toEqual([]);
  });
});
