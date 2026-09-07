import { z } from "zod";

import type { DocumentMeta, Finding, Requirement } from "@/types/api";
import {
  dashboardSummarySchema,
  portfolioSummarySchema,
  regulationMapNodeSchema,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Charge exigences + constats de plusieurs régulations en parallèle, sans texte de
 * procédure (`includeEvidence: false`) : les agrégats de portefeuille et la carte
 * mentale n'ont besoin que de compter par `assessment`/`human_status`/domaine, jamais
 * d'afficher une preuve. Sur 8 régulations, charger le texte de chaque procédure
 * impactée pour rien aurait multiplié le nombre de requêtes sans utilité.
 */
async function loadPortfolioData(regulations: readonly DocumentMeta[]) {
  const perRegulation = await Promise.all(
    regulations.map(async (regulation) => {
      const requirements = await backend.fetchRequirements(regulation.document_id);
      const findings = await backend.fetchFindings(regulation.document_id, {
        includeEvidence: false,
        requirements,
      });
      return { regulationId: regulation.document_id, requirements, findings };
    }),
  );

  const requirementsById = new Map<string, Requirement[]>(
    perRegulation.map(({ regulationId, requirements }) => [regulationId, requirements]),
  );
  const findingsById = new Map<string, Finding[]>(
    perRegulation.map(({ regulationId, findings }) => [regulationId, findings]),
  );

  return {
    requirementsOf: (id: string) => requirementsById.get(id) ?? [],
    findingsOf: (id: string) => findingsById.get(id) ?? [],
  };
}

/**
 * Arborescence Régulation → Exigence → Procédure (carte mentale du tableau de bord).
 * `/api/dashboard/map` n'existe pas côté backend : recalculée côté client avec
 * `buildRegulationMap`, la même fonction pure que MSW utilise déjà — voir
 * `loadPortfolioData` pour la limite assumée (pas de preuve chargée).
 */
export async function fetchRegulationMap() {
  if (isBackendLive) {
    const { buildRegulationMap } = await import("@/lib/mocks/summary");
    const regulations = await backend.fetchRegulations();
    const { requirementsOf, findingsOf } = await loadPortfolioData(regulations);
    return buildRegulationMap(regulations, requirementsOf, findingsOf);
  }

  return apiFetch("/api/dashboard/map", z.array(regulationMapNodeSchema));
}

/**
 * Agrégats de toutes les régulations — écran d'accueil et cartes de la liste.
 * `/api/dashboard/overview` n'existe pas côté backend : recalculés côté client avec
 * `buildPortfolioSummary`, la même fonction pure que MSW utilise déjà.
 */
export async function fetchPortfolioSummary() {
  if (isBackendLive) {
    const { buildPortfolioSummary } = await import("@/lib/mocks/summary");
    const regulations = await backend.fetchRegulations();
    const { requirementsOf, findingsOf } = await loadPortfolioData(regulations);
    return buildPortfolioSummary(regulations, requirementsOf, findingsOf);
  }

  return apiFetch("/api/dashboard/overview", portfolioSummarySchema);
}

/**
 * `/api/dashboard/summary` n'existe pas côté backend. En mode réel, on recalcule les
 * mêmes agrégats **côté client** avec `buildDashboardSummary` — la fonction pure que
 * MSW utilise déjà pour ce même calcul (`src/lib/mocks/summary.ts`) — à partir des
 * exigences et des constats réels (`GET /api/mappings/*`, ajouté par Thư le
 * 2026-09-07). Un seul calcul d'agrégation dans tout le projet, jamais deux à
 * maintenir en parallèle. `includeEvidence: false` : cet onglet ne fait qu'agréger des
 * compteurs, jamais afficher une preuve — la requête distincte de l'onglet « Analyse
 * d'impact » (`fetchFindingsByRegulation`, cache TanStack Query séparé) recharge les
 * constats avec leurs preuves quand l'utilisateur l'ouvre.
 */
export async function fetchDashboardSummary(regulationId: string) {
  if (isBackendLive) {
    const { buildDashboardSummary } = await import("@/lib/mocks/summary");
    const requirements = await backend.fetchRequirements(regulationId);
    const findings = await backend.fetchFindings(regulationId, {
      includeEvidence: false,
      requirements,
    });
    return buildDashboardSummary(requirements, findings);
  }

  return apiFetch("/api/dashboard/summary", dashboardSummarySchema, {
    searchParams: { regulation_id: regulationId },
  });
}
