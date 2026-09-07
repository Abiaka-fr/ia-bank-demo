import { describe, expect, it } from "vitest";

import { deriveCurrentVersionId } from "./current-version-id";

describe("deriveCurrentVersionId", () => {
  it("suit la convention vérifiée sur la base de référence (VER-{id}-{NN})", () => {
    // Arrange / Act / Assert
    expect(deriveCurrentVersionId("EXT-EU-AML-001", "2.0")).toBe(
      "VER-EXT-EU-AML-001-02",
    );
    expect(deriveCurrentVersionId("EXT-EBA-KYC-002", "1")).toBe(
      "VER-EXT-EBA-KYC-002-01",
    );
  });

  it("renvoie null si la version courante est absente ou illisible", () => {
    // Un null explicite signale l'appelant plutôt qu'un identifiant halluciné.
    expect(deriveCurrentVersionId("EXT-EU-AML-001", null)).toBeNull();
    expect(deriveCurrentVersionId("EXT-EU-AML-001", undefined)).toBeNull();
    expect(deriveCurrentVersionId("EXT-EU-AML-001", "")).toBeNull();
    expect(deriveCurrentVersionId("EXT-EU-AML-001", "abc")).toBeNull();
    expect(deriveCurrentVersionId("EXT-EU-AML-001", "0")).toBeNull();
  });
});
