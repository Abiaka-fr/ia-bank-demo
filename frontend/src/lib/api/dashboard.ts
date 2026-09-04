import { dashboardSummarySchema, portfolioSummarySchema } from "@/types/api";

import { apiFetch } from "./client";

/** Agrégats de toutes les régulations — écran d'accueil et cartes de la liste. */
export function fetchPortfolioSummary() {
  return apiFetch("/api/dashboard/overview", portfolioSummarySchema);
}

export function fetchDashboardSummary(regulationId: string) {
  return apiFetch("/api/dashboard/summary", dashboardSummarySchema, {
    searchParams: { regulation_id: regulationId },
  });
}
