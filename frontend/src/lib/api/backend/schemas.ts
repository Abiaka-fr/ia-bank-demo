/**
 * Miroir Zod des réponses **réelles** du backend de Thư.
 *
 * ⚠️ Ne pas confondre avec `src/types/api.ts`, qui est le miroir de
 * `docs/api-contract.md`. Les deux formes divergent aujourd'hui (analyse complète dans
 * `docs/backend-integration.md`) : ce fichier décrit ce que le serveur envoie vraiment,
 * `adapt.ts` traduit vers les types du contrat, et les écrans ne voient que le contrat.
 *
 * Garder les deux séparés est ce qui permet de ne PAS assouplir les schémas du contrat
 * pour « faire passer » une réponse : une divergence se voit ici, pas en dissolvant la
 * vérité côté contrat.
 *
 * Source : `backend/API.md` et `backend/app/schemas/`, relus le 2026-09-07.
 */
import { z } from "zod";

/** Enveloppe de pagination commune à toutes les listes du backend. */
function paginated<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    total: z.number(),
    items: z.array(item),
    limit: z.number(),
    offset: z.number(),
  });
}

export const backendUserSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  full_name: z.string().nullable().optional(),
  role: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export const backendTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  user: backendUserSchema,
});

export const backendDocumentSchema = z.object({
  document_id: z.string(),
  title: z.string(),
  category: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  origin_code: z.string().nullable().optional(),
  origin_name: z.string().nullable().optional(),
  /** Chaîne unique côté backend, tableau côté contrat — voir `adapt.ts`. */
  domain: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  current_version: z.string().nullable().optional(),
  current_file_path: z.string().nullable().optional(),
  data_classification: z.string().nullable().optional(),
  created_at: z.string(),
});

export const backendDocumentListSchema = paginated(backendDocumentSchema);

export const backendDocumentVersionSchema = z.object({
  version_id: z.string(),
  document_id: z.string(),
  version_no: z.string().nullable().optional(),
  version_timestamp: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  change_reason: z.string().nullable().optional(),
});

export const backendDocumentChunkSchema = z.object({
  chunk_id: z.string(),
  document_id: z.string(),
  version_id: z.string(),
  chunk_no: z.number().nullable().optional(),
  section_title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
});

export const backendDocumentContentSchema = z.object({
  version: backendDocumentVersionSchema,
  chunks: z.array(backendDocumentChunkSchema),
  total_chunks: z.number(),
});

export const backendRequirementSchema = z.object({
  requirement_id: z.string(),
  source_document_id: z.string(),
  title: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  requirement_text: z.string().nullable().optional(),
  risk_level: z.string().nullable().optional(),
  source_reference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const backendRequirementListSchema = paginated(
  backendRequirementSchema,
).extend({
  document_ids_queried: z.array(z.string()),
});

/**
 * Couples exigence × procédure — `POST db41421` (2026-09-07). Correspond très
 * exactement au `Finding` du contrat v1.1 : c'est la matière brute qui manquait pour
 * remplir les onglets « Vue d'ensemble » et « Analyse d'impact » (voir `finding-adapt.ts`).
 */
export const backendMappingSchema = z.object({
  mapping_id: z.string(),
  requirement_id: z.string(),
  procedure_id: z.string(),
  assessment: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  explanation: z.string().nullable().optional(),
  recommended_action: z.string().nullable().optional(),
  human_status: z.string().nullable().optional(),
});

export const backendMappingListSchema = paginated(backendMappingSchema);

/** Version allégée de `backendDocumentSchema` — c'est ce que renvoient les nœuds imbriqués. */
export const backendProcedureMinimalSchema = z.object({
  procedure_id: z.string(),
  document_id: z.string(),
  name: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  // Vu en base : `current_version` est parfois un nombre (`3.0`) et non une chaîne.
  current_version: z.union([z.string(), z.number()]).nullable().optional(),
});

/** Version allégée de `backendRequirementSchema` — pas de `requirement_text` ici. */
export const backendRequirementMinimalSchema = z.object({
  requirement_id: z.string(),
  source_document_id: z.string(),
  title: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  risk_level: z.string().nullable().optional(),
  source_reference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const backendRequirementWithProceduresSchema = z.object({
  requirement: backendRequirementMinimalSchema,
  procedures: z.array(
    z.object({
      procedure: backendProcedureMinimalSchema,
      mapping: backendMappingSchema,
    }),
  ),
  total_procedures: z.number(),
});

export const backendRequirementsToProceduresSchema = z.object({
  total_requirements: z.number(),
  total_mappings: z.number(),
  data: z.array(backendRequirementWithProceduresSchema),
});

/** Format d'erreur du backend — `{detail}`, là où le contrat prévoit `{error:{code,message}}`. */
export const backendErrorSchema = z.object({
  detail: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
});

export type BackendUser = z.infer<typeof backendUserSchema>;
export type BackendDocument = z.infer<typeof backendDocumentSchema>;
export type BackendDocumentContent = z.infer<typeof backendDocumentContentSchema>;
export type BackendRequirement = z.infer<typeof backendRequirementSchema>;
export type BackendMapping = z.infer<typeof backendMappingSchema>;
export type BackendProcedureMinimal = z.infer<typeof backendProcedureMinimalSchema>;
export type BackendRequirementWithProcedures = z.infer<
  typeof backendRequirementWithProceduresSchema
>;
