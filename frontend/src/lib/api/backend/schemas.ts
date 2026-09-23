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

/** `GET /api/users` (2026-09-07, commit `624db76`) — liste paginée. */
export const backendUserListSchema = paginated(backendUserSchema);

export const backendTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  user: backendUserSchema,
});

export const backendDocumentSchema = z
  .object({
    document_id: z.string(),
    title: z.string(),
    category: z.string().nullable().optional(),
    document_type: z.string().nullable().optional(),
    origin_code: z.string().nullable().optional(),
    origin_name: z.string().nullable().optional(),
    /** Chaîne unique côté backend, tableau côté contrat — voir `adapt.ts`. */
    domain: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    // Vu en base : parfois un nombre (`3.0`) plutôt qu'une chaîne — Thư a élargi son
    // propre schéma Pydantic le 2026-09-09 (`Fix API get documents`) après l'avoir
    // rencontré. Même élargissement ici, pas un assouplissement de notre cru.
    current_version: z.union([z.string(), z.number()]).nullable().optional(),
    current_file_path: z.string().nullable().optional(),
    data_classification: z.string().nullable().optional(),
    /** v1.10 — ISO 8601 timestamp of creation */
    created_at: z.string().nullable().optional(),
    /** v1.10 — ISO 8601 timestamp of last modification */
    updated_at: z.string().nullable().optional(),
    /** v1.10 — document summary/description */
    summary: z.string().nullable().optional(),
    /** Publication/release date of the document */
    published_at: z.string().nullable().optional(),
    /** Ajouté par Thư le 2026-09-15 (`4ea5611`, « Add assignee column in table
     * document ») — user_id ou email, voir `PUT /api/documents/:id/assignee`. */
    assignee: z.string().nullable().optional(),
  })
  // Allow extra fields from backend (graceful degradation for API evolution)
  .passthrough();

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

export const backendMappingHistorySchema = z.object({
  history_id: z.string(),
  mapping_id: z.string(),
  requirement_id: z.string(),
  procedure_id: z.string().nullable().optional(),
  from_status: z.string().nullable().optional(),
  to_status: z.string(),
  assignee: z.string().nullable().optional(),
  new_version_id: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  actor: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

/** `GET /api/documents/{id}/history` — changements de personne en charge (`audit_history`). */
export const backendAssigneeHistorySchema = z.object({
  audit_id: z.string(),
  document_id: z.string(),
  from_assignee: z.string().nullable().optional(),
  to_assignee: z.string().nullable().optional(),
  actor: z.string().nullable().optional(),
  event_timestamp: z.string().nullable().optional(),
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

export const backendRequirementSchema = z
  .object({
    requirement_id: z.string(),
    source_document_id: z.string(),
    title: z.string().nullable().optional(),
    // Ajoutés par Thư le 2026-09-10 (`be74658`, « Add requirement and title in French »),
    // absents sur les exigences plus anciennes — voir `docs/api-contract.md` v1.9.
    title_lang_fr: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    requirement_text: z.string().nullable().optional(),
    requirement_text_lang_fr: z.string().nullable().optional(),
    risk_level: z.string().nullable().optional(),
    source_reference: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    /** Evidence text extracted from the source document. */
    evidence: z.string().nullable().optional(),
  })
  // Allow extra fields from backend (graceful degradation for API evolution)
  .passthrough();

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
export const backendSuggestedModificationSchema = z.object({
  location: z
    .object({
      chunk_no: z.number().nullable().optional(),
      start_offset: z.number().nullable().optional(),
      end_offset: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  original_text: z.string(),
  new_text: z.string(),
});

export const backendMappingSchema = z
  .object({
    mapping_id: z.string(),
    requirement_id: z.string(),
    procedure_id: z.string(),
    assessment: z.string().nullable().optional(),
    confidence: z.number().nullable().optional(),
    explanation: z.string().nullable().optional(),
    recommended_action: z.string().nullable().optional(),
    // Ajoutés par Thư le 2026-09-09 soir (`ea02f49`, « Add French for explanation and
    // recommendation ») — variantes françaises, absentes sur les couples plus anciens.
    explanation_lang_fr: z.string().nullable().optional(),
    recommended_action_lang_fr: z.string().nullable().optional(),
    human_status: z.string().nullable().optional(),
    // Ajouté par Thư le 2026-09-07 après-midi (`PUT .../assignee`), sans migration —
    // absent d'une base non synchronisée. Optionnel ici pour la même raison.
    assignee: z.string().nullable().optional(),
    // Suggested modifications for the impacted procedure (e.g., from GET /api/mappings/{id})
    suggested_modifications: z.array(backendSuggestedModificationSchema).nullable().optional(),
  })
  .passthrough();

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
  title_lang_fr: z.string().nullable().optional(),
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

/**
 * Response from POST /api/requirements/extract — contains extracted requirement IDs and count.
 */
export const backendExtractRequirementsSchema = z.object({
  document_id: z.string(),
  requirements_count: z.number(),
  requirement_ids: z.array(z.string()),
});

/** Response from POST /api/mappings/analyze — one entry per requirement analysed. */
export const backendAnalyzeMappingsSchema = z.array(
  z.object({
    requirement_id: z.string(),
    mappings_created: z.number(),
    mapping_ids: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
);

/** Response from DELETE /api/documents/{document_id} — rows removed by the cascade. */
export const backendDeleteDocumentSchema = z.object({
  document_id: z.string(),
  message: z.string(),
  deleted_counts: z.object({
    document_versions: z.number(),
    document_chunks: z.number(),
    requirements: z.number(),
    requirement_mappings: z.number(),
  }),
});

/** Format d'erreur du backend — `{detail}`, là où le contrat prévoit `{error:{code,message}}`. */
export const backendErrorSchema = z.object({
  detail: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
});

export type BackendUser = z.infer<typeof backendUserSchema>;
export type BackendDocument = z.infer<typeof backendDocumentSchema>;
export type BackendDocumentContent = z.infer<typeof backendDocumentContentSchema>;
export type BackendDocumentVersion = z.infer<typeof backendDocumentVersionSchema>;
export type BackendRequirement = z.infer<typeof backendRequirementSchema>;
export type BackendMapping = z.infer<typeof backendMappingSchema>;
export type BackendProcedureMinimal = z.infer<typeof backendProcedureMinimalSchema>;
export type BackendRequirementWithProcedures = z.infer<
  typeof backendRequirementWithProceduresSchema
>;
export type BackendSuggestedModification = z.infer<
  typeof backendSuggestedModificationSchema
>;

// Nested response from GET /api/mappings/{mapping_id}
export const backendMappingDetailRequirementSchema = backendRequirementMinimalSchema.extend({
  evidence: z.string().nullable().optional(),
});

export const backendMappingDetailProcedureSchema = backendProcedureMinimalSchema.extend({
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const backendMappingDetailSchema = z.object({
  mapping: backendMappingSchema,
  requirement: backendMappingDetailRequirementSchema,
  requirement_source_document: backendDocumentSchema,
  procedure: backendMappingDetailProcedureSchema,
});

export type BackendMappingDetail = z.infer<typeof backendMappingDetailSchema>;
export type BackendMappingDetailRequirement = z.infer<
  typeof backendMappingDetailRequirementSchema
>;
export type BackendMappingDetailProcedure = z.infer<
  typeof backendMappingDetailProcedureSchema
>;
