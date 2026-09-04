/**
 * État mutable de la couche de mock (validations humaines saisies pendant la démo).
 *
 * Le tableau n'est jamais muté en place : chaque écriture remplace la référence par
 * une nouvelle liste, conformément aux règles de style du projet.
 *
 * Les décisions sont persistées dans `sessionStorage` afin de survivre à un
 * rechargement de page pendant une démo. La portée "session" est volontaire : un
 * nouvel onglet repart du corpus d'origine.
 */
import { z } from "zod";

import { findingSchema, type Finding, type ValidateFindingBody } from "@/types/api";

import { seedFindings } from "./data/findings";

const STORAGE_KEY = "ia-bank.mock-findings";

function readPersisted(): readonly Finding[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = z.array(findingSchema).safeParse(JSON.parse(raw));
    // Un état persisté obsolète (corpus modifié depuis) est ignoré, pas propagé.
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function persist(next: readonly Finding[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sans persistance, les décisions restent valables jusqu'au rechargement.
  }
}

let findings: readonly Finding[] = readPersisted() ?? seedFindings;

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
    reviewer_comment: body.reviewer_comment,
    updated_at: new Date().toISOString(),
  };

  findings = findings.map((finding) =>
    finding.finding_id === findingId ? updated : finding,
  );
  persist(findings);

  return updated;
}

/** Utilisé par les tests pour repartir d'un état propre. */
export function resetStore(): void {
  findings = seedFindings;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}
