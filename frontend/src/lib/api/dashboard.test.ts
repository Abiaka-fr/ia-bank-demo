import { delay, http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { fetchPortfolioSummary, fetchRegulationMap } from "./dashboard";
import { writeToken } from "./token";

// Mode backend réel, servi ici par MSW (URL relative).
vi.mock("./backend/config", () => ({ isBackendLive: true, API_BASE_URL: "" }));

afterEach(() => window.localStorage.clear());

it("charge tout le portefeuille en trois requêtes, quel que soit le nombre de régulations", async () => {
  writeToken("jwt");
  const calls: string[] = [];
  const page = (items: unknown[]) => ({ total: items.length, items, limit: 200, offset: 0 });
  // REQ-n appartient à REG-n.
  const regulationOf = (requirementId: string) => requirementId.replace("REQ", "REG");
  server.use(
    http.get("/api/documents", async () => {
      // Notée à la réponse : permet de voir ce qui est parti sans l'attendre.
      await delay(30);
      calls.push("documents");
      return HttpResponse.json(
        page(
          ["REG-1", "REG-2"].map((document_id) => ({
            document_id,
            title: "Regulation",
            category: "EXTERNAL",
            created_at: null,
          })),
        ),
      );
    }),
    http.get("/api/requirements/by-documents", ({ request }) => {
      calls.push("requirements");
      const ids = new URL(request.url).searchParams.getAll("document_ids");
      return HttpResponse.json({
        ...page(
          ids.map((source_document_id) => ({
            requirement_id: source_document_id.replace("REG", "REQ"),
            source_document_id,
            title: "Requirement",
          })),
        ),
        document_ids_queried: ids,
      });
    }),
    http.get("/api/mappings/requirements-to-procedures", ({ request }) => {
      calls.push("mappings");
      const ids = new URL(request.url).searchParams.getAll("requirement_ids");
      return HttpResponse.json({
        total_requirements: ids.length,
        total_mappings: ids.length,
        data: ids.map((requirement_id) => ({
          requirement: { requirement_id, source_document_id: regulationOf(requirement_id) },
          procedures: [
            {
              procedure: { procedure_id: "PROC-1", document_id: "PROC-1", name: "KYC procedure" },
              mapping: {
                mapping_id: `MAP-${requirement_id}`,
                requirement_id,
                procedure_id: "PROC-1",
                assessment: "POTENTIAL_GAP",
                human_status: "PENDING_REVIEW",
              },
            },
          ],
          total_procedures: 1,
        })),
      });
    }),
  );

  const [summary, map] = await Promise.all([fetchPortfolioSummary(), fetchRegulationMap()]);

  // Deux régulations : toujours une liste, une page d'exigences, un lot de mappings —
  // partagés par les agrégats et la carte, et aucun texte de procédure.
  expect([...calls].sort()).toEqual(["documents", "mappings", "requirements"]);
  expect(summary.requirements_identified).toBe(2);
  // Chaque exigence et son constat reviennent sous leur propre régulation.
  expect(
    map.map((regulation) => [
      regulation.regulation_id,
      regulation.requirements.map((requirement) => requirement.requirement_id),
      regulation.requirements.flatMap((requirement) =>
        requirement.procedures.map((procedure) => procedure.finding_id),
      ),
    ]),
  ).toEqual([
    ["REG-1", ["REQ-1"], ["MAP-REQ-1"]],
    ["REG-2", ["REQ-2"], ["MAP-REQ-2"]],
  ]);

  // Une seule régulation : ses exigences partent sans attendre la liste des documents.
  calls.length = 0;
  expect(await fetchRegulationMap("REG-1")).toHaveLength(1);
  expect(calls[0]).toBe("requirements");
  expect([...calls].sort()).toEqual(["documents", "mappings", "requirements"]);
});
