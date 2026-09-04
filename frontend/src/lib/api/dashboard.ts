import { dashboardSummarySchema } from "@/types/api";

import { apiFetch } from "./client";

export function fetchDashboardSummary(regulationId: string) {
  return apiFetch("/api/dashboard/summary", dashboardSummarySchema, {
    searchParams: { regulation_id: regulationId },
  });
}
