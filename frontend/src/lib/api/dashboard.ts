import { z } from "zod";

import {
  dashboardSummarySchema,
  portfolioSummarySchema,
  regulationMapNodeSchema,
} from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { ApiError, apiFetch } from "./client";

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
 * Repli quand `GET /api/dashboard/portfolio` ne répond pas : groupes de régulations chargés
 * en parallèle. Mesuré le 2026-10-07 sur le backend hébergé, qui ne servait vite que
 * 5 requêtes à la fois :
 * - une requête par régulation (7 en parallèle) : tableau de bord affiché après 5,5 à 6,5 s ;
 * - tout en une requête : 6,3 à 8,3 s — au-delà de 200 exigences les pages se suivent, et un
 *   lot de 100 exigences répond bien plus lentement qu'un petit ;
 * - 4 groupes au plus : 5,1 à 5,3 s.
 * ponytail: groupes égaux en nombre de régulations, pas d'exigences.
 */
const MAX_PARALLEL_GROUPS = 4;

function inGroups<T>(items: readonly T[], count: number): T[][] {
  const size = Math.ceil(items.length / count);
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    groups.push(items.slice(start, start + size));
  }
  return groups;
}

/** Régulations, exigences et constats requête par requête : une seule régulation, ou repli. */
async function loadByRequests(regulationId?: string) {
  const load = async (ids: readonly string[]) => {
    const requirements = await backend.fetchRequirements(ids);
    return { requirements, findings: await backend.fetchFindingsOfRequirements(requirements) };
  };
  // Chaque groupe enchaîne ses exigences puis ses constats sans attendre les autres.
  const loadInGroups = async (ids: readonly string[]) => {
    const groups = await Promise.all(inGroups(ids, MAX_PARALLEL_GROUPS).map(load));
    return {
      requirements: groups.flatMap((group) => group.requirements),
      findings: groups.flatMap((group) => group.findings),
    };
  };

  // Une seule régulation : son identifiant est déjà connu, ses exigences partent en même
  // temps que la liste au lieu de l'attendre (un aller-retour de moins avant l'affichage).
  const listing = backend.fetchRegulations();
  const [all, { requirements, findings }] = await Promise.all([
    listing,
    regulationId
      ? load([regulationId])
      : listing.then((listed) =>
          loadInGroups(listed.map((regulation) => regulation.document_id)),
        ),
  ]);

  return {
    regulations: regulationId
      ? all.filter((regulation) => regulation.document_id === regulationId)
      : all,
    requirements,
    findings,
  };
}

/**
 * Régulations (toutes, ou une seule) avec leurs exigences et leurs constats — matière
 * première des agrégats et de la carte mentale, recalculés côté client.
 *
 * Tout le portefeuille vient d'une seule requête (`GET /api/dashboard/portfolio`). Une seule
 * régulation reste chargée requête par requête : sa page charge déjà ses exigences et ses
 * constats, que ce chargement partage.
 */
async function loadPortfolioData(regulationId?: string) {
  const { regulations, requirements, findings } = regulationId
    ? await loadByRequests(regulationId)
    : await backend.fetchPortfolio().catch((error: unknown) => {
        // Session expirée : rien à rattraper. Tout autre échec (backend sans cette route,
        // réponse inattendue) retombe sur le chargement requête par requête.
        // ponytail: repli à retirer quand tous les environnements serviront la route.
        if (error instanceof ApiError && error.status === 401) throw error;
        console.error("GET /api/dashboard/portfolio indisponible : repli par requêtes", error);
        return loadByRequests();
      });

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
