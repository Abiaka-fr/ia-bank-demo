import { z } from "zod";

import {
  dashboardSummarySchema,
  portfolioSummarySchema,
  regulationMapNodeSchema,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(keyOf(item));
    if (group) group.push(item);
    else groups.set(keyOf(item), [item]);
  }
  return groups;
}

/**
 * Régulations (toutes, ou une seule) avec leurs exigences et leurs constats — matière
 * première des agrégats et de la carte mentale, recalculés côté client faute d'endpoint
 * `/api/dashboard/*` côté backend.
 *
 * Trois requêtes à la suite quel que soit le nombre de régulations : la liste, toutes les
 * exigences, tous les constats. Une requête d'exigences et une de constats par régulation
 * dépassaient ce que le backend hébergé sert vite en même temps (mesuré le 2026-10-07 :
 * 16 requêtes pour 7 régulations, tableau de bord affiché après 5,5 à 6,5 s).
 */
async function loadPortfolioData(regulationId?: string) {
  const load = async (ids: readonly string[]) => {
    const requirements = await backend.fetchRequirements(ids);
    return { requirements, findings: await backend.fetchFindingsOfRequirements(requirements) };
  };

  // Une seule régulation : son identifiant est déjà connu, ses exigences partent en même
  // temps que la liste au lieu de l'attendre (un aller-retour de moins avant l'affichage).
  const listing = backend.fetchRegulations();
  const [all, { requirements, findings }] = await Promise.all([
    listing,
    regulationId
      ? load([regulationId])
      : listing.then((listed) => load(listed.map((regulation) => regulation.document_id))),
  ]);
  const regulations = regulationId
    ? all.filter((regulation) => regulation.document_id === regulationId)
    : all;

  const regulationOf = new Map(
    requirements.map((requirement) => [requirement.requirement_id, requirement.source_document_id]),
  );
  const requirementsById = groupBy(requirements, (requirement) => requirement.source_document_id);
  const findingsById = groupBy(
    findings,
    (finding) => regulationOf.get(finding.requirement_id) ?? "",
  );

  return {
    regulations,
    requirementsOf: (id: string) => requirementsById.get(id) ?? [],
    findingsOf: (id: string) => findingsById.get(id) ?? [],
  };
}

// ponytail: seuls les appels simultanés sont partagés — un écran lance agrégats et carte
// en même temps, et chargeait donc deux fois le même portefeuille. Pas de cache dans le
// temps : c'est le rôle de TanStack Query.
const portfolioInFlight = new Map<string, ReturnType<typeof loadPortfolioData>>();

function loadPortfolio(regulationId?: string) {
  const key = regulationId ?? "";
  let pending = portfolioInFlight.get(key);
  if (!pending) {
    pending = loadPortfolioData(regulationId).finally(() => portfolioInFlight.delete(key));
    portfolioInFlight.set(key, pending);
  }
  return pending;
}

/**
 * Arborescence Régulation → Exigence → Procédure (carte mentale). `/api/dashboard/map`
 * n'existe pas côté backend : recalculée côté client avec `buildRegulationMap`, la même
 * fonction pure que MSW utilise déjà. `regulationId` limite le chargement à une seule
 * régulation (onglet « Vue d'ensemble ») au lieu de tout le portefeuille ; en mode mock
 * la réponse reste complète et l'appelant filtre.
 */
export async function fetchRegulationMap(regulationId?: string) {
  if (isBackendLive) {
    const { buildRegulationMap } = await import("@/lib/mocks/summary");
    const { regulations, requirementsOf, findingsOf } = await loadPortfolio(regulationId);
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
    const { regulations, requirementsOf, findingsOf } = await loadPortfolio();
    return buildPortfolioSummary(regulations, requirementsOf, findingsOf);
  }

  return apiFetch("/api/dashboard/overview", portfolioSummarySchema);
}

/**
 * `/api/dashboard/summary` n'existe pas côté backend. En mode réel, on recalcule les
 * mêmes agrégats **côté client** avec `buildDashboardSummary` — la fonction pure que
 * MSW utilise déjà pour ce même calcul (`src/lib/mocks/summary.ts`). Un seul calcul
 * d'agrégation dans tout le projet, jamais deux à maintenir en parallèle. Partage son
 * chargement avec la carte mentale de la même régulation (`loadPortfolio`).
 */
export async function fetchDashboardSummary(regulationId: string) {
  if (isBackendLive) {
    const { buildDashboardSummary } = await import("@/lib/mocks/summary");
    const { requirementsOf, findingsOf } = await loadPortfolio(regulationId);
    return buildDashboardSummary(requirementsOf(regulationId), findingsOf(regulationId));
  }

  return apiFetch("/api/dashboard/summary", dashboardSummarySchema, {
    searchParams: { regulation_id: regulationId },
  });
}
