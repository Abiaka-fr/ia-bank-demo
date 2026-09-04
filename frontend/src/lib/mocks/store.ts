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
  documentDetailSchema,
  findingSchema,
  type DocumentDetail,
  type Finding,
  type ValidateFindingBody,
} from "@/types/api";

import { regulations as seedRegulations } from "./data/documents";
import { seedFindings } from "./data/findings";

const FINDINGS_KEY = "ia-bank.mock-findings";
const REGULATIONS_KEY = "ia-bank.mock-regulations";

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

/** Utilisé par les tests pour repartir d'un état propre. */
export function resetStore(): void {
  findings = seedFindings;
  regulations = seedRegulations;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FINDINGS_KEY);
    window.sessionStorage.removeItem(REGULATIONS_KEY);
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}
