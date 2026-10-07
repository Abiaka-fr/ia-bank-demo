import { http, HttpResponse } from "msw";
import { z } from "zod";
import { describe, expect, it } from "vitest";

import { server } from "@/lib/mocks/server";

import { ApiContractError, apiFetch } from "./client";

const okSchema = z.object({ ok: z.literal(true) });

describe("apiFetch", () => {
  it("valide la réponse contre le schéma fourni", async () => {
    server.use(http.get("/api/exemple", () => HttpResponse.json({ ok: true })));

    expect(await apiFetch("/api/exemple", okSchema)).toEqual({ ok: true });
  });

  it("lève ApiContractError si la réponse ne suit pas le contrat", async () => {
    // Entre `1a88b12` et le 2026-10-02, la réponse était renvoyée telle quelle (non
    // validée). Une divergence doit se voir ici, pas faire planter un composant plus loin.
    server.use(http.get("/api/exemple", () => HttpResponse.json({ ok: "oui" })));

    await expect(apiFetch("/api/exemple", okSchema)).rejects.toBeInstanceOf(ApiContractError);
  });

  it("transforme une erreur HTTP du contrat en ApiError", async () => {
    server.use(
      http.get("/api/exemple", () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "Introuvable" } },
          { status: 404 },
        ),
      ),
    );

    await expect(apiFetch("/api/exemple", okSchema)).rejects.toMatchObject({
      name: "ApiError",
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
