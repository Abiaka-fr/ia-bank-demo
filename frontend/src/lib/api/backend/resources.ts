/**
 * Implémentations « backend réel » des ressources que Thư couvre aujourd'hui.
 *
 * Chaque fonction renvoie des types du **contrat** : l'appelant (`src/lib/api/*.ts`)
 * choisit la source, les écrans ne savent pas laquelle a répondu.
 *
 * Couvert ici : authentification (`signin` et `signup`, v1.4), documents (régulations et
 * procédures), exigences,
 * constats (`GET /api/mappings/*`, ajouté par Thư le 2026-09-07 — voir
 * `finding-adapt.ts` pour les limites assumées de cette traduction), liste des
 * utilisateurs (`GET /api/users`, 2026-09-07 ; `PUT /api/users/:id/role`, 2026-09-09 soir)
 * et validation humaine (`PUT /api/mappings/:id/human-status`+`/assignee`,
 * 2026-09-07 après-midi).
 * Import de documents (`POST /api/documents/regulation-ingest`, `/api/procedures/ingest`),
 * versions d'un document, historique des décisions (`GET /api/mappings/history`).
 * Non couvert par le backend et donc absent de ce fichier — cela reste sur MSW :
 * tableau de bord global.
 */
import { z } from "zod";

import type {
  AuditHistoryEntry,
  DocumentDetail,
  DocumentMeta,
  Finding,
  Language,
  LoginBody,
  LoginResponse,
  Requirement,
  SignupBody,
  UpdateUserRoleBody,
  User,
  ValidateFindingBody,
} from "@/types/api";

import { ApiError } from "../client";

import {
  adaptDocument,
  adaptDocumentDetail,
  adaptExtractedText,
  adaptRequirement,
  adaptUser,
} from "./adapt";
import { BackendGapError, backendFetch } from "./client";
import { deriveCurrentVersionId } from "./current-version-id";
import {
  adaptAssessment,
  adaptHumanStatus,
  adaptHumanStatusToBackend,
  assembleMappedFinding,
  assembleUnmappedFinding,
} from "./finding-adapt";
import {
  backendDocumentContentSchema,
  backendExtractRequirementsSchema,
  backendDocumentListSchema,
  backendDocumentSchema,
  backendDocumentVersionSchema,
  backendMappingDetailSchema,
  backendMappingHistorySchema,
  backendMappingSchema,
  backendRequirementListSchema,
  backendRequirementsToProceduresSchema,
  backendTokenSchema,
  backendUserListSchema,
  backendUserSchema,
  type BackendDocumentVersion,
  type BackendMappingDetail,
  type BackendProcedureMinimal,
} from "./schemas";

/** Le backend plafonne `limit` à 200 ; le corpus en compte 32, une page suffit. */
const PAGE_LIMIT = "200";

// --- Authentification -------------------------------------------------------

/**
 * `POST /api/auth/signin` — le backend fait autorité sur l'authentification (vrai JWT,
 * là où le frontend simulait). Le nom de la route diffère du contrat (`login`), d'où
 * la traduction ici plutôt que dans les écrans.
 */
export async function signIn(body: LoginBody): Promise<LoginResponse> {
  const response = await backendFetch("/api/auth/signin", backendTokenSchema, {
    method: "POST",
    body: { email: body.email, password: body.password },
    skipAuth: true,
  });

  return { user: adaptUser(response.user), token: response.access_token };
}

/**
 * `POST /api/auth/signup` (v1.4) — crée un compte et renvoie un JWT, comme `signin`.
 * Le backend fixe `role` à `COMPLIANCE_OFFICER` pour tout nouveau compte : rien dans le
 * corps de la requête ne permet de le choisir, et aucune route ne permet de le changer
 * ensuite (voir `docs/backend-integration.md`).
 */
export async function signUp(body: SignupBody): Promise<LoginResponse> {
  const response = await backendFetch("/api/auth/signup", backendTokenSchema, {
    method: "POST",
    body: { email: body.email, password: body.password, full_name: body.full_name },
    skipAuth: true,
  });

  return { user: adaptUser(response.user), token: response.access_token };
}

// --- Documents --------------------------------------------------------------

async function listDocuments(category: "EXTERNAL" | "INTERNAL") {
  const response = await backendFetch("/api/documents", backendDocumentListSchema, {
    searchParams: { category, limit: PAGE_LIMIT },
  });
  return response.items.map(adaptDocument);
}

/** Les régulations sont les documents `EXTERNAL` du backend. */
export function fetchRegulations(): Promise<DocumentMeta[]> {
  return listDocuments("EXTERNAL");
}

/** Les procédures internes sont les documents `INTERNAL`. */
export function fetchProcedures(): Promise<DocumentMeta[]> {
  return listDocuments("INTERNAL");
}

/**
 * Détail d'un document + son texte source.
 *
 * Le texte demande un second appel, et l'identifiant de version doit être reconstruit
 * (voir `current-version-id.ts`). Si le backend ne connaît pas la version déduite, on
 * lève une erreur explicite : mieux vaut un message clair qu'un onglet « Texte source »
 * silencieusement vide.
 */
/**
 * `PUT /api/documents/:id/assignee` (Thư, 2026-09-15, commit `4ea5611`) — remplace le
 * correctif local `regulation-assignee-overrides.ts` (le backend n'avait avant aucun
 * champ `assignee` sur un document, donc l'assignation d'une régulation réelle ne
 * pouvait pas être persistée côté serveur). `assignee` accepte un `user_id` ou un
 * e-mail d'après `backend/API.md` — l'app envoie toujours le `user_id` déjà utilisé
 * partout ailleurs (`AssigneeSelect`).
 */
export async function updateDocumentAssignee(
  id: string,
  assignee: string | null,
): Promise<DocumentMeta> {
  const response = await backendFetch(
    `/api/documents/${encodeURIComponent(id)}/assignee`,
    backendDocumentSchema,
    { method: "PUT", body: { assignee } },
  );
  return adaptDocument(response);
}

/** Corps commun aux deux routes d'ingestion (`backend/API.md` § 3). */
export type IngestDocumentBody = {
  text: string;
  title: string;
  domain: string;
  language: Language;
  summary?: string;
  created_by: string;
  published_at?: string;
};

/**
 * `POST /api/documents/regulation-ingest` ou `POST /api/procedures/ingest`. Le backend
 * pose `assignee = created_by` : une autre personne en charge demande un second appel.
 * Si celui-ci échoue, le document est déjà créé — on ne le fait pas passer pour un
 * import raté (l'assignation reste modifiable sur la carte).
 */
export async function ingestDocument(
  path: "/api/documents/regulation-ingest" | "/api/procedures/ingest",
  body: IngestDocumentBody,
  assigneeId?: string,
): Promise<DocumentMeta> {
  const created = adaptDocument(
    await backendFetch(path, backendDocumentSchema, { method: "POST", body }),
  );
  if (!assigneeId || assigneeId === body.created_by) return created;

  return updateDocumentAssignee(created.document_id, assigneeId).catch((error) => {
    console.error(`Assignation de ${created.document_id} non enregistrée`, error);
    return created;
  });
}

export async function fetchDocumentDetail(id: string): Promise<DocumentDetail> {
  const document = await backendFetch(
    `/api/documents/${encodeURIComponent(id)}`,
    backendDocumentSchema,
  );

  const versionId = deriveCurrentVersionId(id, document.current_version);
  if (!versionId) {
    throw new BackendGapError(
      `Version courante inconnue pour ${id} : le backend ne renvoie pas d'identifiant de version.`,
    );
  }

  try {
    const content = await backendFetch(
      `/api/documents/content/${encodeURIComponent(versionId)}`,
      backendDocumentContentSchema,
    );
    return adaptDocumentDetail(document, content);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new BackendGapError(
        `Contenu introuvable pour ${id} (version déduite : ${versionId}). ` +
          "La convention d'identifiant de version a changé côté backend.",
      );
    }
    throw error;
  }
}

/** `GET /api/documents/{id}/versions` (2026-09-21) — métadonnées, plus ancienne d'abord. */
export function fetchDocumentVersions(documentId: string): Promise<BackendDocumentVersion[]> {
  return backendFetch(
    `/api/documents/${encodeURIComponent(documentId)}/versions`,
    z.array(backendDocumentVersionSchema),
  );
}

/** Texte d'une version précise (`GET /api/documents/content/{version_id}`). */
export async function fetchDocumentVersionText(versionId: string): Promise<string> {
  const content = await backendFetch(
    `/api/documents/content/${encodeURIComponent(versionId)}`,
    backendDocumentContentSchema,
  );
  return adaptExtractedText(content);
}

// --- Exigences --------------------------------------------------------------

/**
 * `GET /api/requirements/by-documents` — le backend sait déjà filtrer par `domain`,
 * `risk_level`, `language` et `status`. On lui passe le filtre plutôt que de tout
 * charger pour filtrer côté client.
 */
export async function fetchRequirements(
  documentId: string,
  filters: { domain?: string } = {},
): Promise<Requirement[]> {
  const response = await backendFetch(
    "/api/requirements/by-documents",
    backendRequirementListSchema,
    {
      searchParams: {
        document_ids: [documentId],
        domain: filters.domain,
        limit: PAGE_LIMIT,
      },
    },
  );

  return response.items.map(adaptRequirement);
}

// --- Constats (couples exigence × procédure) --------------------------------

/**
 * Un seul appel réseau, même si plusieurs couples pointent vers le même document
 * interne : les échecs individuels (procédure sans version exploitable, etc.) ne
 * font pas échouer tout l'onglet — la ligne concernée perd juste sa preuve interne.
 */
async function fetchProcedureDocumentsByDocumentId(
  documentIds: readonly string[],
): Promise<Map<string, DocumentDetail | null>> {
  const uniqueIds = [...new Set(documentIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (documentId): Promise<[string, DocumentDetail | null]> => {
      try {
        return [documentId, await fetchDocumentDetail(documentId)];
      } catch (error) {
        console.error(
          `Texte de la procédure ${documentId} indisponible pour la preuve interne`,
          error,
        );
        return [documentId, null];
      }
    }),
  );
  return new Map(entries);
}

/**
 * Constats d'une régulation, à partir de `GET /api/mappings/requirements-to-procedures`
 * (ajouté par Thư le 2026-09-07). Voir `finding-adapt.ts` pour la limite assumée sur
 * `internal_evidence` (extrait non ciblé, faute de lien exigence×procédure vers un
 * passage précis côté backend).
 *
 * `includeEvidence: false` saute le chargement du texte des procédures (et donc
 * `internal_evidence`) — utile pour les agrégats du tableau de bord (portefeuille,
 * carte mentale), qui n'ont besoin que de `assessment`/`human_status`/`procedure_id`
 * et n'affichent aucune preuve. Sur 8 régulations, charger le texte de chaque
 * procédure impactée pour rien aurait fait exploser le nombre de requêtes.
 *
 * `requirements`, si fourni, évite un second appel à `fetchRequirements` quand
 * l'appelant les a déjà en main (voir `dashboard.ts`, qui construit le portefeuille
 * sur plusieurs régulations à la fois).
 */
export async function fetchFindings(
  regulationId: string,
  options: { includeEvidence?: boolean; requirements?: Requirement[] } = {},
): Promise<Finding[]> {
  const { includeEvidence = true } = options;

  const requirements = options.requirements ?? (await fetchRequirements(regulationId));
  if (requirements.length === 0) return [];

  // Le titre ne sert qu'à `regulatory_evidence.document_title`, jamais affiché en
  // mode agrégats (`includeEvidence: false`) : pas la peine de le charger.
  const regulationTitle = includeEvidence
    ? (
        await backendFetch(
          `/api/documents/${encodeURIComponent(regulationId)}`,
          backendDocumentSchema,
        )
      ).title
    : "";

  const nested = await backendFetch(
    "/api/mappings/requirements-to-procedures",
    backendRequirementsToProceduresSchema,
    { searchParams: { requirement_ids: requirements.map((r) => r.requirement_id) } },
  );

  const requirementsById = new Map(requirements.map((r) => [r.requirement_id, r]));

  const procedureDocuments = includeEvidence
    ? await fetchProcedureDocumentsByDocumentId(
        nested.data.flatMap((item) => item.procedures.map(({ procedure }) => procedure.document_id)),
      )
    : new Map<string, DocumentDetail | null>();

  const findings: Finding[] = [];

  for (const item of nested.data) {
    const requirement = requirementsById.get(item.requirement.requirement_id);
    if (!requirement) {
      // Ne devrait pas arriver : on a demandé exactement ces identifiants. Une ligne
      // ignorée plutôt qu'un onglet cassé si le backend renvoie un id inattendu.
      console.error(
        `Exigence ${item.requirement.requirement_id} absente de la réponse attendue`,
      );
      continue;
    }

    if (item.procedures.length === 0) {
      findings.push(
        assembleUnmappedFinding({
          requirement,
          riskLevel: item.requirement.risk_level,
          regulationTitle,
        }),
      );
      continue;
    }

    for (const { procedure, mapping } of item.procedures) {
      const typedProcedure: BackendProcedureMinimal = procedure;
      findings.push(
        assembleMappedFinding({
          mapping,
          requirement,
          riskLevel: item.requirement.risk_level,
          regulationTitle,
          procedure: typedProcedure,
          procedureDocument: procedureDocuments.get(typedProcedure.document_id) ?? null,
        }),
      );
    }
  }

  return findings;
}

// --- Utilisateurs -------------------------------------------------------------

/**
 * `GET /api/users` (ajouté par Thư le 2026-09-07) — répond à la question ouverte n°6
 * de `docs/backend-integration.md`. Sert les mêmes sélecteurs d'assignation que le
 * mode mock (`AssigneeSelect`, `useUsers`) : les écrans ne savent pas laquelle a
 * répondu.
 */
export async function fetchUsers(): Promise<User[]> {
  const response = await backendFetch("/api/users", backendUserListSchema, {
    searchParams: { limit: PAGE_LIMIT },
  });
  return response.items.map(adaptUser);
}

/**
 * `PUT /api/users/:id/role` (v1.5, commit `fabd0cf` — « Create API to update role of
 * user ») : répond au point resté ouvert en v1.4 (aucune route ne permettait de
 * choisir ou changer `User.role`). **Limite assumée** : la route n'a aucun contrôle
 * d'autorisation — n'importe quel compte authentifié peut changer le rôle de
 * n'importe quel autre, voir `docs/backend-integration.md`.
 */
export async function updateUserRole(
  userId: string,
  body: UpdateUserRoleBody,
): Promise<User> {
  const response = await backendFetch(
    `/api/users/${encodeURIComponent(userId)}/role`,
    backendUserSchema,
    { method: "PUT", body: { role: body.role } },
  );
  return adaptUser(response);
}

/**
 * Get complete details of a specific mapping with nested requirement and procedure data.
 * Endpoint: `GET /api/mappings/{mapping_id}`
 */
export async function fetchMappingDetail(
  mappingId: string,
): Promise<BackendMappingDetail> {
  return backendFetch(
    `/api/mappings/${encodeURIComponent(mappingId)}`,
    backendMappingDetailSchema,
  );
}

// --- Validation humaine ---------------------------------------------------------

/**
 * Persiste une décision humaine via `PUT /api/mappings/:id/human-status`. Voir
 * `finding-adapt.ts::adaptHumanStatusToBackend` pour la traduction d'énumération
 * (verbe court côté backend, participe passé côté contrat).
 *
 * Limites assumées, documentées dans `docs/known-limitations.md` :
 * - le backend ne connaît ni `actor_id` ni `reviewer_comment` : la décision est
 *   persistée, mais pas journalisée — l'onglet Historique reste sur MSW ;
 * - une exigence sans procédure associée (`assembleUnmappedFinding`, préfixe
 *   `NO-MAPPING-`) n'a pas de ligne `RequirementProcedureMap` côté backend : il n'y a
 *   rien à persister, l'appel échoue explicitement plutôt que de faire semblant ;
 * - `ACCEPTED` : le backend applique les modifications suggérées à la procédure et en
 *   crée une nouvelle version (2026-09-21) ;
 * - `ESCALATED` : `assignee` obligatoire, enregistré par le backend sur le document de la
 *   procédure (`documents.assignee`), pas sur le constat — il n'est donc pas relu ici.
 */
export async function validateMapping(
  mappingId: string,
  body: ValidateFindingBody,
): Promise<Finding> {
  if (mappingId.startsWith("NO-MAPPING-")) {
    throw new BackendGapError(
      `Aucun mapping backend pour ${mappingId} : cette exigence n'a aucune procédure ` +
        "associée, il n'y a donc rien à persister côté serveur.",
    );
  }

  const latest = await backendFetch(
    `/api/mappings/${encodeURIComponent(mappingId)}/human-status`,
    backendMappingSchema,
    {
      method: "PUT",
      body: {
        human_status: adaptHumanStatusToBackend(body.human_status),
        assignee: body.human_status === "ESCALATED" ? body.assignee_id : undefined,
        comment: body.custom_action,
      },
    },
  );

  // `priority` vit sur l'exigence (`risk_level`), pas sur le mapping : la valeur
  // exacte revient au prochain chargement de la liste, invalidé juste après par
  // l'appelant (`finding-action-row.tsx`) — ce retour ne sert qu'au toast immédiat.
  return {
    finding_id: latest.mapping_id,
    requirement_id: latest.requirement_id,
    procedure_id: latest.procedure_id,
    assessment: adaptAssessment(latest.assessment),
    regulatory_evidence: [],
    internal_evidence: [],
    explanation: latest.explanation ?? "",
    missing_or_ambiguous_elements: [],
    recommended_action: latest.recommended_action ?? "",
    custom_action: body.custom_action,
    priority: "MEDIUM",
    confidence_or_evidence_strength: latest.confidence ?? undefined,
    human_status: adaptHumanStatus(latest.human_status),
    assignee_id: body.assignee_id,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Extract regulatory requirements from a document using LLM analysis.
 * Calls backend endpoint: POST /api/requirements/extract
 */
export async function extractRequirementsFromBackend(
  documentId: string,
): Promise<{
  document_id: string;
  requirements_count: number;
  requirement_ids: string[];
}> {
  return backendFetch(
    "/api/requirements/extract",
    backendExtractRequirementsSchema,
    {
      method: "POST",
      body: { document_id: documentId },
    },
  );
}

/**
 * Historique des décisions (`GET /api/mappings/history`, table `mapping_history`,
 * 2026-09-21) sur les couples des exigences d'une régulation. Les remises à
 * « En attente » sont écartées : l'onglet ne montre que des décisions.
 */
export async function fetchMappingHistory(regulationId: string): Promise<AuditHistoryEntry[]> {
  const requirements = await fetchRequirements(regulationId);
  if (requirements.length === 0) return [];

  const rows = await backendFetch("/api/mappings/history", z.array(backendMappingHistorySchema), {
    searchParams: { requirement_ids: requirements.map((r) => r.requirement_id) },
  });

  return rows.flatMap((row): AuditHistoryEntry[] => {
    const action = adaptHumanStatus(row.to_status);
    if (action === "PENDING") return [];
    return [
      {
        entry_id: row.history_id,
        regulation_id: regulationId,
        requirement_id: row.requirement_id,
        finding_id: row.mapping_id,
        procedure_id: row.procedure_id ?? null,
        action,
        actor_id: row.actor ?? "",
        custom_action: row.comment ?? undefined,
        created_at: row.created_at ?? "",
        previous_status: row.from_status ? adaptHumanStatus(row.from_status) : undefined,
        assignee_id: row.assignee ?? undefined,
        new_version_id: row.new_version_id ?? undefined,
      },
    ];
  });
}

/**
 * Historique des décisions pour un mapping spécifique — requête par mapping_id.
 * Filtre les remises à « En attente » : ne montre que les décisions réelles.
 */
export async function fetchMappingHistoryById(mappingId: string): Promise<AuditHistoryEntry[]> {
  const rows = await backendFetch("/api/mappings/history", z.array(backendMappingHistorySchema), {
    searchParams: { mapping_id: mappingId },
  });

  return rows.flatMap((row): AuditHistoryEntry[] => {
    const action = adaptHumanStatus(row.to_status);
    if (action === "PENDING") return [];
    return [
      {
        entry_id: row.history_id,
        regulation_id: "",
        requirement_id: row.requirement_id,
        finding_id: row.mapping_id,
        procedure_id: row.procedure_id ?? null,
        action,
        actor_id: row.actor ?? "",
        custom_action: row.comment ?? undefined,
        created_at: row.created_at ?? "",
        previous_status: row.from_status ? adaptHumanStatus(row.from_status) : undefined,
        assignee_id: row.assignee ?? undefined,
        new_version_id: row.new_version_id ?? undefined,
      },
    ];
  });
}
