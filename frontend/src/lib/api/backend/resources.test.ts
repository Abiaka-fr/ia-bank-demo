import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { readToken, writeToken } from "../token";

import { fetchEscalationAssignees, signIn } from "./resources";

afterEach(() => window.localStorage.clear());

it("signale des identifiants refusés sans toucher à la session en cours", async () => {
  writeToken("jwt-en-cours");
  server.use(
    http.post("/api/auth/signin", () =>
      HttpResponse.json({ detail: "Invalid email or password" }, { status: 401 }),
    ),
  );

  await expect(signIn({ email: "a@iabank.fr", password: "faux" })).rejects.toMatchObject({
    code: "INVALID_CREDENTIALS",
  });
  expect(readToken()).toBe("jwt-en-cours");
});

it("lit l'assigné d'une escalade dans la ligne ESCALATE la plus récente du mapping", async () => {
  writeToken("jwt");
  const row = (mapping_id: string, to_status: string, assignee: string | null) => ({
    history_id: `${mapping_id}-${to_status}-${assignee}`,
    mapping_id,
    requirement_id: "REQ-1",
    to_status,
    assignee,
  });
  server.use(
    // Le backend renvoie le plus récent en premier.
    http.get("/api/mappings/history", () =>
      HttpResponse.json([
        row("MAP-1", "ESCALATE", "USR-nouveau"),
        row("MAP-2", "ACCEPT", null),
        row("MAP-1", "ESCALATE", "USR-ancien"),
      ]),
    ),
  );

  const assignees = await fetchEscalationAssignees({ requirement_ids: ["REQ-1"] });

  expect([...assignees]).toEqual([["MAP-1", "USR-nouveau"]]);
});

it("renvoie une table vide si l'historique est indisponible", async () => {
  writeToken("jwt");
  vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(http.get("/api/mappings/history", () => new HttpResponse(null, { status: 500 })));

  expect((await fetchEscalationAssignees({ mapping_id: "MAP-1" })).size).toBe(0);
});
