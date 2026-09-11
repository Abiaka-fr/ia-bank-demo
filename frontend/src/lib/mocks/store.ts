/**
 * État mutable de la couche de mock : validations humaines, assignations et
 * régulations uploadées pendant la démo.
 *
 * Rien n'est muté en place — chaque écriture remplace la référence par une nouvelle
 * liste, conformément aux règles de style du projet.
 *
 * Persistance en `sessionStorage` pour survivre à un rechargement de page. La portée
 * "session" est volontaire : un nouvel onglet repart du corpus d'origine.
 */
import { z } from "zod";

import {
  auditHistoryEntrySchema,
  documentDetailSchema,
  findingSchema,
  userSchema,
  type AuditHistoryEntry,
  type DocumentDetail,
  type Finding,
  type User,
  type ValidateFindingBody,
} from "@/types/api";

import { procedures as seedProcedures, regulations as seedRegulations } from "./data/documents";
import { seedFindings } from "./data/findings";
import { users as seedUsers } from "./data/users";

const FINDINGS_KEY = "ia-bank.mock-findings";
const REGULATIONS_KEY = "ia-bank.mock-regulations";
const PROCEDURES_KEY = "ia-bank.mock-procedures";
const HISTORY_KEY = "ia-bank.mock-history";
const USERS_KEY = "ia-bank.mock-users";
/** Mots de passe des comptes créés par `POST /api/auth/signup` — jamais les 4 comptes
 * de démo d'origine, qui continuent de partager `DEMO_PASSWORD` (voir `data/users.ts`). */
const PASSWORDS_KEY = "ia-bank.mock-passwords";

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    // Un état persisté obsolète (corpus modifié depuis) est ignoré, pas propagé.
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sans persistance, l'état reste valable jusqu'au rechargement.
  }
}

let findings: readonly Finding[] =
  read(FINDINGS_KEY, z.array(findingSchema)) ?? seedFindings;

let regulations: readonly DocumentDetail[] =
  read(REGULATIONS_KEY, z.array(documentDetailSchema)) ?? seedRegulations;

/** Écran `/procedures` (Phase 6 §2.2 / Phase 7 Jour 0) — même pattern que `regulations`. */
let procedures: readonly DocumentDetail[] =
  read(PROCEDURES_KEY, z.array(documentDetailSchema)) ?? seedProcedures;

let history: readonly AuditHistoryEntry[] =
  read(HISTORY_KEY, z.array(auditHistoryEntrySchema)) ?? [];

let users: readonly User[] = read(USERS_KEY, z.array(userSchema)) ?? seedUsers;

let passwordsByEmail: Readonly<Record<string, string>> =
  read(PASSWORDS_KEY, z.record(z.string(), z.string())) ?? {};

// --- Constats -------------------------------------------------------------

export function listFindings(): readonly Finding[] {
  return findings;
}

export function findFinding(findingId: string): Finding | undefined {
  return findings.find((finding) => finding.finding_id === findingId);
}

export function applyValidation(
  findingId: string,
  body: ValidateFindingBody,
): Finding | undefined {
  const current = findFinding(findingId);
  if (!current) return undefined;

  const updated: Finding = {
    ...current,
    human_status: body.human_status,
    custom_action: body.custom_action,
    reviewer_comment: body.reviewer_comment,
    // L'assignation n'a de sens qu'à l'escalade ; ailleurs on la remet à zéro.
    assignee_id: body.human_status === "ESCALATED" ? body.assignee_id : undefined,
    updated_at: new Date().toISOString(),
  };

  findings = findings.map((finding) =>
    finding.finding_id === findingId ? updated : finding,
  );
  write(FINDINGS_KEY, findings);

  return updated;
}

// --- Historique -------------------------------------------------------------

/**
 * Une entrée par décision humaine (Accepter / Rejeter / Escalader) — jamais pour
 * `PENDING`, qui est l'absence de décision. `regulationId` est fourni par
 * l'appelant (le handler MSW, qui connaît déjà l'exigence liée au constat) plutôt
 * que recalculé ici : ce module ne connaît pas le corpus des exigences.
 */
export function appendHistoryEntry(
  entry: Omit<AuditHistoryEntry, "entry_id" | "created_at">,
): AuditHistoryEntry {
  const created: AuditHistoryEntry = {
    ...entry,
    entry_id: `AUD-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
  };

  history = [created, ...history];
  write(HISTORY_KEY, history);
  return created;
}

/** Plus récent en premier — c'est un journal, pas une liste à trier par l'écran. */
export function listHistory(regulationId: string): readonly AuditHistoryEntry[] {
  return history.filter((entry) => entry.regulation_id === regulationId);
}

// --- Régulations ----------------------------------------------------------

export function listRegulations(): readonly DocumentDetail[] {
  return regulations;
}

export function findRegulation(id: string): DocumentDetail | undefined {
  return regulations.find((regulation) => regulation.document_id === id);
}

export function addRegulation(regulation: DocumentDetail): DocumentDetail {
  regulations = [regulation, ...regulations];
  write(REGULATIONS_KEY, regulations);
  return regulation;
}

export function updateRegulationAssignee(
  id: string,
  assigneeId: string,
): DocumentDetail | undefined {
  const current = findRegulation(id);
  if (!current) return undefined;

  const updated: DocumentDetail = { ...current, assignee_id: assigneeId };
  regulations = regulations.map((regulation) =>
    regulation.document_id === id ? updated : regulation,
  );
  write(REGULATIONS_KEY, regulations);
  return updated;
}

// --- Procédures internes ----------------------------------------------------

export function listProcedures(): readonly DocumentDetail[] {
  return procedures;
}

export function findProcedureDoc(id: string): DocumentDetail | undefined {
  return procedures.find((procedure) => procedure.document_id === id);
}

export function addProcedure(procedure: DocumentDetail): DocumentDetail {
  procedures = [procedure, ...procedures];
  write(PROCEDURES_KEY, procedures);
  return procedure;
}

// --- Utilisateurs -----------------------------------------------------------

/** Comptes assignables — les 4 comptes de démo, plus tout compte créé via `signup`. */
export function listUsers(): readonly User[] {
  return users;
}

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === normalized);
}

export function addUser(user: User): User {
  users = [...users, user];
  write(USERS_KEY, users);
  return user;
}

/**
 * v1.5 — aucune restriction ici, comme côté backend réel (`fabd0cf`, « Create API to
 * update role of user ») : la route n'a pas de contrôle d'autorisation propre. `role`
 * reste une chaîne libre, pas une énumération.
 */
export function updateUserRole(userId: string, role: string): User | undefined {
  const current = users.find((user) => user.user_id === userId);
  if (!current) return undefined;

  const updated: User = { ...current, role };
  users = users.map((user) => (user.user_id === userId ? updated : user));
  write(USERS_KEY, users);
  return updated;
}

/** Absent pour les 4 comptes de démo (voir `data/users.ts::DEMO_PASSWORD`). */
export function getPassword(email: string): string | undefined {
  return passwordsByEmail[email.trim().toLowerCase()];
}

export function setPassword(email: string, password: string): void {
  passwordsByEmail = { ...passwordsByEmail, [email.trim().toLowerCase()]: password };
  write(PASSWORDS_KEY, passwordsByEmail);
}

/** Utilisé par les tests pour repartir d'un état propre. */
export function resetStore(): void {
  findings = seedFindings;
  regulations = seedRegulations;
  procedures = seedProcedures;
  history = [];
  users = seedUsers;
  passwordsByEmail = {};
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FINDINGS_KEY);
    window.sessionStorage.removeItem(REGULATIONS_KEY);
    window.sessionStorage.removeItem(PROCEDURES_KEY);
    window.sessionStorage.removeItem(HISTORY_KEY);
    window.sessionStorage.removeItem(USERS_KEY);
    window.sessionStorage.removeItem(PASSWORDS_KEY);
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}
