import { delay, http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { readToken, writeToken } from "../token";

import { fetchEscalationAssignees, fetchUsers, signIn } from "./resources";

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

it("enchaîne les pages au-delà de la limite de 200 du backend", async () => {
  writeToken("jwt");
  const user = (index: number) => ({
    user_id: `USR-${index}`,
    email: `u${index}@iabank.fr`,
    full_name: `User ${index}`,
    role: "COMPLIANCE_OFFICER",
    is_active: true,
    created_at: "2026-09-01T08:00:00",
  });
  const all = Array.from({ length: 201 }, (_, index) => user(index));
  const offsets: string[] = [];
  server.use(
    http.get("/api/users", ({ request }) => {
      const offset = Number(new URL(request.url).searchParams.get("offset"));
      offsets.push(String(offset));
      return HttpResponse.json({
        total: all.length,
        items: all.slice(offset, offset + 200),
        limit: 200,
        offset,
      });
    }),
  );

  const users = await fetchUsers();

  expect(users).toHaveLength(201);
  expect(offsets).toEqual(["0", "200"]);
});

it("renvoie une table vide si l'historique est indisponible", async () => {
  writeToken("jwt");
  vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(http.get("/api/mappings/history", () => new HttpResponse(null, { status: 500 })));

  expect((await fetchEscalationAssignees({ mapping_id: "MAP-1" })).size).toBe(0);
});

it("partage les GET identiques simultanés, jamais par-dessus une écriture", async () => {
  writeToken("jwt");
  const user = {
    user_id: "USR-1",
    email: "u1@iabank.fr",
    full_name: "User 1",
    role: "COMPLIANCE_OFFICER",
    is_active: true,
    created_at: "2026-09-01T08:00:00",
  };
  let reads = 0;
  server.use(
    http.get("/api/users", async () => {
      reads += 1;
      await delay(30);
      return HttpResponse.json({ total: 1, items: [user], limit: 200, offset: 0 });
    }),
    http.post("/api/auth/signin", () =>
      HttpResponse.json({ access_token: "jwt", token_type: "bearer", user }),
    ),
  );

  // Deux lectures lancées ensemble : une seule requête, deux résultats.
  const [first, second] = await Promise.all([fetchUsers(), fetchUsers()]);
  expect(reads).toBe(1);
  expect(first).toEqual(second);

  // Une lecture partie avant une écriture n'est pas resservie à celle lancée après.
  const before = fetchUsers();
  await signIn({ email: "u1@iabank.fr", password: "x" });
  await Promise.all([before, fetchUsers()]);
  expect(reads).toBe(3);
});
