import { delay, http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { fetchPortfolioSummary, fetchRegulationMap } from "./dashboard";
import { writeToken } from "./token";

// Mode backend réel, servi ici par MSW (URL relative).
vi.mock("./backend/config", () => ({ isBackendLive: true, API_BASE_URL: "" }));

afterEach(() => window.localStorage.clear());

it("ne charge le portefeuille qu'une fois pour les agrégats et la carte lancés ensemble", async () => {
  writeToken("jwt");
  const calls: string[] = [];
  const page = (items: unknown[]) => ({ total: items.length, items, limit: 200, offset: 0 });
  server.use(
    http.get("/api/documents", async () => {
      // Notée à la réponse : permet de voir ce qui est parti sans l'attendre.
      await delay(30);
      calls.push("documents");
      return HttpResponse.json(
        page([{ document_id: "REG-1", title: "Regulation", category: "EXTERNAL", created_at: null }]),
      );
    }),
    http.get("/api/requirements/by-documents", () => {
      calls.push("requirements");
      return HttpResponse.json({
        ...page([{ requirement_id: "REQ-1", source_document_id: "REG-1", title: "Requirement" }]),
        document_ids_queried: ["REG-1"],
      });
    }),
    http.get("/api/mappings/requirements-to-procedures", () => {
      calls.push("mappings");
      return HttpResponse.json({
        total_requirements: 1,
        total_mappings: 1,
        data: [
          {
            requirement: { requirement_id: "REQ-1", source_document_id: "REG-1" },
            procedures: [
              {
                procedure: { procedure_id: "PROC-1", document_id: "PROC-1", name: "KYC procedure" },
                mapping: {
                  mapping_id: "MAP-1",
                  requirement_id: "REQ-1",
                  procedure_id: "PROC-1",
                  assessment: "POTENTIAL_GAP",
                  human_status: "PENDING_REVIEW",
                },
              },
            ],
            total_procedures: 1,
          },
        ],
      });
    }),
  );

  const [summary, map] = await Promise.all([fetchPortfolioSummary(), fetchRegulationMap()]);

  expect(summary.requirements_identified).toBe(1);
  expect(map).toHaveLength(1);
  // Une liste, une page d'exigences, un lot de mappings — et aucun texte de procédure.
  expect([...calls].sort()).toEqual(["documents", "mappings", "requirements"]);

  // Une seule régulation : ses exigences partent sans attendre la liste des documents.
  calls.length = 0;
  expect(await fetchRegulationMap("REG-1")).toHaveLength(1);
  expect(calls[0]).toBe("requirements");
  expect([...calls].sort()).toEqual(["documents", "mappings", "requirements"]);
});
