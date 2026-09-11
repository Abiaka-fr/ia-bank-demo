/**
 * Handlers MSW — implémentent **exactement** les endpoints de `docs/api-contract.md`
 * (v1.1). Avant d'ajouter une route ici, vérifier qu'elle figure bien dans le contrat.
 */
import { HttpResponse, http } from "msw";

import { toMeta } from "./data/documents";
import { ACPR_REGULATION_ID } from "./data/documents";
import { requirements } from "./data/requirements";
import { DEMO_PASSWORD } from "./data/users";
import {
  addProcedure,
  addRegulation,
  addUser,
  appendHistoryEntry,
  applyValidation,
  findFinding,
  findProcedureDoc,
  findRegulation,
  findUserByEmail,
  getPassword,
  listFindings,
  listHistory,
  listProcedures,
  listRegulations,
  listUsers,
  setPassword,
  updateRegulationAssignee,
  updateUserRole,
} from "./store";
import {
  buildDashboardSummary,
  buildPortfolioSummary,
  buildRegulationMap,
} from "./summary";
import {
  analyzeProcedureBodySchema,
  signupBodySchema,
  updateUserRoleBodySchema,
  validateFindingBodySchema,
  type DocumentDetail,
  type User,
} from "@/types/api";

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
    // Les 4 comptes de démo d'origine partagent `DEMO_PASSWORD` (aucun mot de passe
    // propre stocké pour eux) ; tout compte créé via `signup` a le sien.
    const expectedPassword = user ? (getPassword(user.email) ?? DEMO_PASSWORD) : null;

    if (!user || body.password !== expectedPassword) {
      return errorResponse(
        401,
        "INVALID_CREDENTIALS",
        "Identifiants incorrects.",
      );
    }

    return HttpResponse.json({ user, token: `demo-token-${user.user_id}` });
  }),

  // v1.4 — le backend de Thư expose déjà cette route ; côté mock, un compte créé ici
  // rejoint la liste des utilisateurs assignables (`GET /api/users`) pour le reste de
  // la session. Le rôle est fixé, comme côté backend réel : aucune route ne permet
  // encore de le choisir ou de le changer (voir `docs/backend-integration.md`).
  http.post("/api/auth/signup", async ({ request }) => {
    await delay();
    const parsed = signupBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(422, "INVALID_BODY", "Requête invalide.");
    }
    const { email, password, full_name } = parsed.data;

    if (findUserByEmail(email)) {
      return errorResponse(
        409,
        "EMAIL_TAKEN",
        "Cette adresse e-mail est déjà utilisée.",
      );
    }

    const user: User = {
      user_id: `USR-${Date.now().toString(36)}${Math.round(Math.random() * 1000)}`,
      full_name: full_name?.trim() || email.split("@")[0],
      email,
      role: "Responsable Conformité",
    };
    addUser(user);
    setPassword(email, password);

    return HttpResponse.json(
      { user, token: `demo-token-${user.user_id}` },
      { status: 201 },
    );
  }),

  http.post("/api/auth/logout", async () => {
    await delay();
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/users", async () => {
    await delay();
    return HttpResponse.json(listUsers());
  }),

  // v1.5 — le backend de Thư expose déjà cette route (`fabd0cf`) ; côté mock, aucune
  // restriction non plus (voir `store.ts::updateUserRole`).
  http.put("/api/users/:userId/role", async ({ params, request }) => {
    await delay();
    const parsed = updateUserRoleBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(422, "INVALID_BODY", "Requête invalide.");
    }

    const updated = updateUserRole(String(params.userId), parsed.data.role);
    if (!updated) return notFound("Utilisateur introuvable.");

    return HttpResponse.json(updated);
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
    return HttpResponse.json(listProcedures().map(toMeta));
  }),

  http.post("/api/procedures", async ({ request }) => {
    await delay();
    const form = await request.formData();
    const file = form.get("file");
    const declaredName = form.get("file_name");
    const assigneeId = form.get("assignee_id");
    const uploadedById = form.get("uploaded_by_id");

    if (file === null || typeof file === "string") {
      return errorResponse(400, "FILE_REQUIRED", "Aucun fichier reçu.");
    }

    const fileName =
      typeof declaredName === "string" && declaredName ? declaredName : file.name;

    if (!fileName.toLowerCase().endsWith(".docx")) {
      return errorResponse(
        415,
        "UNSUPPORTED_FILE_TYPE",
        "Seuls les fichiers Word (.docx) sont acceptés.",
      );
    }

    // Comme pour les régulations : aucune exigence/analyse n'est inventée à l'upload,
    // la procédure démarre en NOT_ANALYZED (v1.8).
    const uploaded: DocumentDetail = {
      document_id: `PROC-UP-${Date.now()}`,
      title: fileName.replace(/\.docx$/i, ""),
      document_type: "INTERNAL_PROCEDURE",
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

    return HttpResponse.json(toMeta(addProcedure(uploaded)), { status: 201 });
  }),

  http.get("/api/procedures/:id", async ({ params }) => {
    await delay();
    const procedure = findProcedureDoc(String(params.id));
    if (!procedure) return notFound(`Procédure ${String(params.id)} inconnue`);
    return HttpResponse.json(procedure);
  }),

  http.post("/api/procedures/:id/analyze", async ({ params, request }) => {
    await delay();
    const procedureId = String(params.id);
    // Pas de `notFound` ici, volontairement : en mode backend réel
    // (`NEXT_PUBLIC_BACKEND_URL` renseigné), l'identifiant vient du backend de Thư et
    // n'existe jamais dans le corpus mock — un 404 romprait l'analyse pour toute
    // procédure réelle. On répond avec ce que le corpus de démo connaît (souvent rien),
    // jamais avec une erreur : `bank_requirements_identified: 0` est une réponse
    // honnête, pas un échec.

    // `scope` n'affecte jamais l'analyse Bank : aucune recherche européenne réelle
    // n'est branchée ici (v1.7/v1.8), donc `BANK_PLUS_EU` ne fait qu'accepter la
    // requête sans échouer — les compteurs Europe restent `undefined`, affichés
    // par l'écran avec `AwaitingBackendBadge` plutôt qu'un chiffre inventé.
    const parsedBody = analyzeProcedureBodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsedBody.success) {
      return errorResponse(400, "INVALID_BODY", "Corps de requête invalide pour l'analyse.");
    }

    // Seuls les constats déjà rattachés à cette procédure dans le corpus de démo sont
    // renvoyés (ex. CASE-09 / PROC-ICT-017, docs/use-cases.md) — jamais un constat
    // fabriqué pour une procédure qui n'en a pas.
    const procedureFindings = listFindings().filter(
      (finding) => finding.procedure_id === procedureId,
    );
    const requirementIds = new Set(procedureFindings.map((finding) => finding.requirement_id));
    const procedureRequirements = requirements.filter((requirement) =>
      requirementIds.has(requirement.requirement_id),
    );

    return HttpResponse.json({
      bank_requirements_identified: requirementIds.size,
      findings: procedureFindings,
      requirements: procedureRequirements,
    });
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
