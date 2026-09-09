import { describe, expect, it } from "vitest";

import { pickLocalizedText } from "./localized-text";

describe("pickLocalizedText", () => {
  it("renvoie la variante française quand l'interface est en français", () => {
    expect(pickLocalizedText("fr", "English text", "Texte français")).toBe(
      "Texte français",
    );
  });

  it("renvoie le texte principal quand l'interface est en anglais", () => {
    expect(pickLocalizedText("en", "English text", "Texte français")).toBe(
      "English text",
    );
  });

  it("retombe sur le texte principal en français si aucune variante n'est fournie", () => {
    // Cas du mode mock : le corpus de démo n'a qu'un seul champ, déjà en français.
    expect(pickLocalizedText("fr", "Texte déjà en français", undefined)).toBe(
      "Texte déjà en français",
    );
  });
});
