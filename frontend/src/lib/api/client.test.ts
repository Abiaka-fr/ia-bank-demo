import { http, HttpResponse } from "msw";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";
import { documentMetaSchema, findingSchema } from "@/types/api";

import { ApiError, apiFetch } from "./client";
import { fetchFindingsByRegulation, validateFinding } from "./findings";
import { fetchRegulations } from "./regulations";

const ACPR_ID = "REG-ACPR-2026-04";

describe("apiFetch", () => {
  it("valide la réponse contre le schéma du contrat d'API", async () => {
    const regulations = await fetchRegulations();

    expect(regulations.length).toBeGreaterThan(0);
    expect(() =>
      z.array(documentMetaSchema).parse(regulations),
    ).not.toThrow();
  });

  it("dégrade gracieusement (log + renvoie les champs disponibles) si la réponse ne suit pas le contrat", async () => {
    // Arrange : le backend renvoie un champ manquant / mal typé. Depuis `1a88b12`,
    // `apiFetch` ne lève plus `ApiContractError` sur une non-conformité — un écran ne
    // doit pas casser en entier pour un champ que le backend n'a pas encore livré
    // (ex. les nouvelles dates v1.10 le temps que Thư finisse le déploiement) ; la
    // non-conformité reste tracée en console plutôt que masquée en silence.
    server.use(
      http.get("/api/regulations", () =>
        HttpResponse.json([{ document_id: 42 }]),
      ),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const result = await fetchRegulations();

    // Assert
    expect(result).toEqual([{ document_id: 42 }]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("API contract mismatch"),
      expect.any(String),
      expect.any(String),
    );

    warnSpy.mockRestore();
  });

  it("transforme une erreur HTTP du contrat en ApiError", async () => {
    await expect(
      apiFetch("/api/regulations/INCONNUE", documentMetaSchema),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("validation d'un constat", () => {
  it("enregistre la décision humaine et le commentaire du relecteur", async () => {
    // Arrange
    const before = await fetchFindingsByRegulation(ACPR_ID);
    const target = before[0];
    expect(target.human_status).toBe("PENDING");

    // Act
    const updated = await validateFinding(target.finding_id, {
      human_status: "ESCALATED",
      reviewer_comment: "À arbitrer avec la Direction Conformité",
      actor_id: "USR-001",
    });

    // Assert
    expect(findingSchema.parse(updated).human_status).toBe("ESCALATED");
    expect(updated.reviewer_comment).toBe(
      "À arbitrer avec la Direction Conformité",
    );

    const after = await fetchFindingsByRegulation(ACPR_ID);
    expect(
      after.find((finding) => finding.finding_id === target.finding_id)
        ?.human_status,
    ).toBe("ESCALATED");
  });

  it("renvoie une ApiError pour un constat inconnu", async () => {
    await expect(
      validateFinding("FND-INCONNU", { human_status: "ACCEPTED", actor_id: "USR-001" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("cloisonnement par régulation", () => {
  it("ne renvoie aucun constat pour une régulation non analysée", async () => {
    const findings = await fetchFindingsByRegulation("REG-EBA-GL-2026-03");
    expect(findings).toEqual([]);
  });
});
