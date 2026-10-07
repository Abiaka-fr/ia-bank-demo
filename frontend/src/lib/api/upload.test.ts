import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { writeToken } from "./token";
import { uploadDocument } from "./upload";

// Mode backend réel, servi ici par MSW (URL relative).
vi.mock("./backend/config", () => ({ isBackendLive: true, API_BASE_URL: "" }));

afterEach(() => window.localStorage.clear());

it("envoie les métadonnées saisies dans la modale, puis assigne à une autre personne", async () => {
  writeToken("jwt");
  const document = { document_id: "REG-1", title: "Instruction test", category: "EXTERNAL" };
  let ingested: unknown;
  let assigned: unknown;
  server.use(
    http.post("/api/documents/regulation-ingest", async ({ request }) => {
      ingested = await request.json();
      return HttpResponse.json(document);
    }),
    http.put("/api/documents/REG-1/assignee", async ({ request }) => {
      assigned = await request.json();
      return HttpResponse.json({ ...document, assignee: "USR-003" });
    }),
  );

  const created = await uploadDocument("regulation", {
    file: new File(["contenu factice"], "Instruction_test.docx"),
    chunks: [{ chunk_no: 1, section_title: "Article 1", content: "Texte" }],
    metadata: {
      title: "  Instruction test ",
      domain: "KYC",
      language: "EN",
      summary: "",
      publishedDate: "2026-09-16",
    },
    uploadedById: "USR-001",
    assigneeId: "USR-003",
  });

  // Métadonnées saisies dans la modale, pas dérivées du nom de fichier ; résumé vide omis.
  expect(ingested).toEqual({
    text: "## Article 1\n\nTexte",
    title: "Instruction test",
    domain: "KYC",
    language: "EN",
    created_by: "USR-001",
    published_at: "2026-09-16T00:00:00",
  });
  // Le backend pose `assignee = created_by` : une autre personne demande un second appel.
  expect(assigned).toEqual({ assignee: "USR-003" });
  expect(created.assignee_id).toBe("USR-003");
});
