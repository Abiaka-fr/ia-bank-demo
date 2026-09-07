/**
 * Handlers MSW — implémentent **exactement** les endpoints de `docs/api-contract.md`
 * (v1.1). Avant d'ajouter une route ici, vérifier qu'elle figure bien dans le contrat.
 */
import { HttpResponse, http } from "msw";

import { toMeta } from "./data/documents";
import { ACPR_REGULATION_ID, procedures } from "./data/documents";
import { requirements } from "./data/requirements";
import { DEMO_PASSWORD, findUserByEmail, users } from "./data/users";
import {
  addRegulation,
  appendHistoryEntry,
  applyValidation,
  findFinding,
  findRegulation,
  listFindings,
  listHistory,
  listRegulations,
  updateRegulationAssignee,
} from "./store";
import {
  buildDashboardSummary,
  buildPortfolioSummary,
  buildRegulationMap,
} from "./summary";
import { validateFindingBodySchema, type DocumentDetail } from "@/types/api";

/** Latence simulée : rend visibles les états de chargement pendant la démo. */
const MOCK_LATENCY_MS = 220;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function notFound(message: string) {
  return errorResponse(404, "NOT_FOUND", message);
}

/** Seule la régulation ACPR du corpus de démo dispose de constats. */
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
  // --- Authentification et utilisateurs (v1.1) ---------------------------

  http.post("/api/auth/login", async ({ request }) => {
    await delay();
    const body = (await request.json()) as { email?: string; password?: string };
    const user = findUserByEmail(body.email ?? "");

    // Démo : un mot de passe unique partagé, affiché sur l'écran de connexion.
    if (!user || body.password !== DEMO_PASSWORD) {
      return errorResponse(
        401,
        "INVALID_CREDENTIALS",
        "Identifiants incorrects.",
      );
    }

    return HttpResponse.json({ user, token: `demo-token-${user.user_id}` });
  }),

  http.post("/api/auth/logout", async () => {
    await delay();
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/users", async () => {
    await delay();
    return HttpResponse.json(users);
  }),

  // --- Régulations --------------------------------------------------------

  http.get("/api/regulations", async () => {
    await delay();
    return HttpResponse.json(listRegulations().map(toMeta));
  }),

  http.post("/api/regulations", async ({ request }) => {
    await delay();
    const form = await request.formData();
    const file = form.get("file");
    const declaredName = form.get("file_name");
    const assigneeId = form.get("assignee_id");
    const uploadedById = form.get("uploaded_by_id");

    // Pas d'`instanceof File` : selon le runtime (navigateur, jsdom, undici) la
    // classe `File` provient d'un realm différent et le contrôle échouerait à tort.
    if (file === null || typeof file === "string") {
      return errorResponse(400, "FILE_REQUIRED", "Aucun fichier reçu.");
    }

    // `file_name` fait foi : le nom porté par la partie multipart n'est pas
    // conservé par tous les runtimes.
    const fileName =
      typeof declaredName === "string" && declaredName ? declaredName : file.name;

    if (!fileName.toLowerCase().endsWith(".docx")) {
      return errorResponse(
        415,
        "UNSUPPORTED_FILE_TYPE",
        "Seuls les fichiers Word (.docx) sont acceptés.",
      );
    }

    // Le backend n'extrait pas encore les exigences : la régulation est créée avec
    // ses seules métadonnées, en NOT_ANALYZED. Aucune exigence n'est inventée.
    const uploaded: DocumentDetail = {
      document_id: `REG-UP-${Date.now()}`,
      title: fileName.replace(/\.docx$/i, ""),
      document_type: "REGULATION",
      authority_or_owner: "—",
      domain: [],
      language: "FR",
      version: "1.0",
      status: "NOT_ANALYZED",
      uploaded_by_id: typeof uploadedById === "string" ? uploadedById : undefined,
      uploaded_at: new Date().toISOString(),
      assignee_id: typeof assigneeId === "string" && assigneeId ? assigneeId : undefined,
      extracted_text: "",
    };

    return HttpResponse.json(toMeta(addRegulation(uploaded)), { status: 201 });
  }),

  http.patch("/api/regulations/:id", async ({ params, request }) => {
    await delay();
    const body = (await request.json()) as { assignee_id?: string };
    if (!body.assignee_id) {
      return errorResponse(400, "INVALID_BODY", "`assignee_id` est requis.");
    }
    const updated = updateRegulationAssignee(String(params.id), body.assignee_id);
    if (!updated) return notFound(`Régulation ${String(params.id)} inconnue`);
    return HttpResponse.json(toMeta(updated));
  }),

  http.get("/api/regulations/:id", async ({ params }) => {
    await delay();
    const regulation = findRegulation(String(params.id));
    if (!regulation) return notFound(`Régulation ${String(params.id)} inconnue`);
    return HttpResponse.json(regulation);
  }),

  http.post("/api/regulations/:id/analyze", async ({ params }) => {
    await delay();
    if (!findRegulation(String(params.id))) {
      return notFound(`Régulation ${String(params.id)} inconnue`);
    }
    return HttpResponse.json({ status: "ANALYZING" });
  }),

  http.get("/api/regulations/:id/requirements", async ({ params }) => {
    await delay();
    return HttpResponse.json(requirementsForRegulation(String(params.id)));
  }),

  // --- Constats -----------------------------------------------------------

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

    if (!findFinding(findingId)) return notFound(`Constat ${findingId} inconnu`);

    const parsed = validateFindingBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        400,
        "INVALID_BODY",
        "Corps de requête invalide pour la validation du constat",
      );
    }

    const updated = applyValidation(findingId, parsed.data);
    if (!updated) return notFound(`Constat ${findingId} inconnu`);

    // PENDING n'est jamais journalisé : ce n'est pas une décision, c'est
    // l'absence d'une (ex. remise à zéro, si un jour l'UI le permet).
    if (updated.human_status !== "PENDING") {
      const requirement = requirements.find(
        (candidate) => candidate.requirement_id === updated.requirement_id,
      );
      if (requirement) {
        appendHistoryEntry({
          regulation_id: requirement.source_document_id,
          requirement_id: updated.requirement_id,
          finding_id: updated.finding_id,
          procedure_id: updated.procedure_id,
          action: updated.human_status,
          actor_id: parsed.data.actor_id,
          custom_action: parsed.data.custom_action,
          reviewer_comment: parsed.data.reviewer_comment,
        });
      }
    }

    return HttpResponse.json(updated);
  }),

  http.get("/api/regulations/:id/history", async ({ params }) => {
    await delay();
    return HttpResponse.json(listHistory(String(params.id)));
  }),

  // --- Dashboard ----------------------------------------------------------

  http.get("/api/dashboard/overview", async () => {
    await delay();
    return HttpResponse.json(
      buildPortfolioSummary(
        listRegulations().map(toMeta),
        requirementsForRegulation,
        findingsForRegulation,
      ),
    );
  }),

  http.get("/api/dashboard/map", async () => {
    await delay();
    return HttpResponse.json(
      buildRegulationMap(
        listRegulations().map(toMeta),
        requirementsForRegulation,
        findingsForRegulation,
      ),
    );
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

  // --- Procédures internes ------------------------------------------------

  http.get("/api/procedures", async () => {
    await delay();
    return HttpResponse.json(procedures.map(toMeta));
  }),

  http.get("/api/procedures/:id", async ({ params }) => {
    await delay();
    const procedure = procedures.find((p) => p.document_id === params.id);
    if (!procedure) return notFound(`Procédure ${String(params.id)} inconnue`);
    return HttpResponse.json(procedure);
  }),

  // Copilot (P2) — répond explicitement qu'aucune preuve n'est disponible plutôt
  // que d'inventer une réponse sans citation (docs/ui-guardrails.md).
  http.post("/api/copilot/ask", async () => {
    await delay();
    return HttpResponse.json({
      answer:
        "Aucune preuve n'a été trouvée : l'assistant conversationnel n'est pas encore connecté au corpus indexé.",
      evidence: [],
    });
  }),
];
