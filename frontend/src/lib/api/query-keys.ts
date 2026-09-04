/** Clés TanStack Query centralisées — évite les chaînes dupliquées dans les écrans. */
export const queryKeys = {
  regulations: () => ["regulations"] as const,
  regulation: (id: string) => ["regulations", id] as const,
  regulationRequirements: (id: string) =>
    ["regulations", id, "requirements"] as const,
  requirementFindings: (requirementId: string) =>
    ["requirements", requirementId, "findings"] as const,
  findings: (regulationId?: string) => ["findings", regulationId ?? null] as const,
  dashboardSummary: (regulationId?: string) =>
    ["dashboard", "summary", regulationId ?? null] as const,
  procedures: () => ["procedures"] as const,
  procedure: (id: string) => ["procedures", id] as const,
} as const;
