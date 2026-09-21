import type { EuSearchParams } from "@/types/api";

/** Clés TanStack Query centralisées — évite les chaînes dupliquées dans les écrans. */
export const queryKeys = {
  regulations: () => ["regulations"] as const,
  regulation: (id: string) => ["regulations", id] as const,
  documentContent: (id: string) => ["documents", id, "content"] as const,
  regulationRequirements: (id: string) =>
    ["regulations", id, "requirements"] as const,
  requirementFindings: (requirementId: string) =>
    ["requirements", requirementId, "findings"] as const,
  findings: (regulationId?: string) => ["findings", regulationId ?? null] as const,
  findingDetail: (id: string) => ["findings", "detail", id] as const,
  dashboardSummary: (regulationId?: string) =>
    ["dashboard", "summary", regulationId ?? null] as const,
  portfolioSummary: () => ["dashboard", "overview"] as const,
  regulationMap: () => ["dashboard", "map"] as const,
  regulationHistory: (id: string) => ["regulations", id, "history"] as const,
  users: () => ["users"] as const,
  procedures: () => ["procedures"] as const,
  procedure: (id: string) => ["procedures", id] as const,
  // Sous `procedure(id)` : invalidé avec elle quand une acceptation crée une version.
  procedureVersions: (id: string) => ["procedures", id, "versions"] as const,
  documentVersionText: (versionId: string) => ["document-versions", versionId] as const,
  euSearch: (params: EuSearchParams) => ["eu-search", params] as const,
  euDocument: (celex: string, lang: string) => ["eu-document", celex, lang] as const,
} as const;
