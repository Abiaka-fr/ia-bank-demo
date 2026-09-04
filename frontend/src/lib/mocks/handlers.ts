/**
 * Handlers MSW — implémentent **exactement** les endpoints de `docs/api-contract.md`.
 * Avant d'ajouter une route ici, vérifier qu'elle figure bien dans le contrat.
 */
import { HttpResponse, http } from "msw";

import { validateFindingBodySchema } from "@/types/api";

import { ACPR_REGULATION_ID, procedures, regulations, toMeta } from "./data/documents";
import { requirements } from "./data/requirements";
import { applyValidation, findFinding, listFindings } from "./store";
import { buildDashboardSummary } from "./summary";

/** Latence simulée : rend visibles les états de chargement pendant la démo. */
const MOCK_LATENCY_MS = 220;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

function notFound(message: string) {
  return HttpResponse.json(
    { error: { code: "NOT_FOUND", message } },
    { status: 404 },
  );
}

/** Seule la régulation ACPR est analysée dans le corpus de démo. */
function findingsForRegulation(regulationId: string | null) {
  if (regulationId !== ACPR_REGULATION_ID) return [];
  return listFindings();
}

function requirementsForRegulation(regulationId: string) {
  return requirements.filter(
    (requirement) => requirement.source_document_id === regulationId,
  );
}

export const handlers = [
  http.get("/api/regulations", async () => {
    await delay();
    return HttpResponse.json(regulations.map(toMeta));
  }),

  http.get("/api/regulations/:id", async ({ params }) => {
    await delay();
    const regulation = regulations.find(
      (candidate) => candidate.document_id === params.id,
    );
    if (!regulation) return notFound(`Régulation ${String(params.id)} inconnue`);
    return HttpResponse.json(regulation);
  }),

  http.post("/api/regulations/:id/analyze", async ({ params }) => {
    await delay();
    const exists = regulations.some(
      (candidate) => candidate.document_id === params.id,
    );
    if (!exists) return notFound(`Régulation ${String(params.id)} inconnue`);
    return HttpResponse.json({ status: "ANALYZING" });
  }),

  http.get("/api/regulations/:id/requirements", async ({ params }) => {
    await delay();
    return HttpResponse.json(requirementsForRegulation(String(params.id)));
  }),

  http.get("/api/requirements/:id/findings", async ({ params }) => {
    await delay();
    return HttpResponse.json(
      listFindings().filter((finding) => finding.requirement_id === params.id),
    );
  }),

  http.get("/api/findings", async ({ request }) => {
    await delay();
    const regulationId = new URL(request.url).searchParams.get("regulation_id");
    return HttpResponse.json(findingsForRegulation(regulationId));
  }),

  http.post("/api/findings/:id/validate", async ({ params, request }) => {
    await delay();
    const findingId = String(params.id);

    if (!findFinding(findingId)) {
      return notFound(`Constat ${findingId} inconnu`);
    }

    const parsed = validateFindingBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "Corps de requête invalide pour la validation du constat",
          },
        },
        { status: 400 },
      );
    }

    const updated = applyValidation(findingId, parsed.data);
    if (!updated) return notFound(`Constat ${findingId} inconnu`);
    return HttpResponse.json(updated);
  }),

  http.get("/api/dashboard/summary", async ({ request }) => {
    await delay();
    const regulationId = new URL(request.url).searchParams.get("regulation_id");
    return HttpResponse.json(
      buildDashboardSummary(
        regulationId ? requirementsForRegulation(regulationId) : [],
        findingsForRegulation(regulationId),
      ),
    );
  }),

  http.get("/api/procedures", async () => {
    await delay();
    return HttpResponse.json(procedures.map(toMeta));
  }),

  http.get("/api/procedures/:id", async ({ params }) => {
    await delay();
    const procedure = procedures.find(
      (candidate) => candidate.document_id === params.id,
    );
    if (!procedure) return notFound(`Procédure ${String(params.id)} inconnue`);
    return HttpResponse.json(procedure);
  }),

  // Copilot (P2) — répond de façon explicite qu'aucune preuve n'est disponible
  // en mock, plutôt que d'inventer une réponse sans citation (docs/ui-guardrails.md).
  http.post("/api/copilot/ask", async () => {
    await delay();
    return HttpResponse.json({
      answer:
        "Aucune preuve n'a été trouvée : l'assistant conversationnel n'est pas encore connecté au corpus indexé.",
      evidence: [],
    });
  }),
];
