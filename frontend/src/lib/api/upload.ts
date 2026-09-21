import { chunksToText, type ExtractedChunk } from "@/lib/file-extract";
import { documentMetaSchema, type Language } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/** Valeurs de `domain` listées par `backend/API.md` pour les deux routes d'ingestion. */
export const DOCUMENT_DOMAINS = [
  "AML/CFT",
  "KYC",
  "DORA",
  "MIFID",
  "SANCTIONS",
  "OUTSOURCING",
  "DATA_PROTECTION",
  "COMPLIANCE",
  "AI_GOVERNANCE",
] as const;

export type DocumentKind = "regulation" | "procedure";

/** Saisie de la modale d'import — le backend n'extrait aucune métadonnée lui-même. */
export type DocumentMetadata = {
  title: string;
  domain: string;
  language: Language;
  summary: string;
  /** `YYYY-MM-DD` (champ `<input type="date">`), vide si inconnue. */
  publishedDate: string;
};

const INGEST_PATHS = {
  regulation: "/api/documents/regulation-ingest",
  procedure: "/api/procedures/ingest",
} as const;

const MOCK_PATHS = {
  regulation: "/api/regulations",
  procedure: "/api/procedures",
} as const;

/**
 * Backend réel : `POST /api/documents/regulation-ingest` ou `POST /api/procedures/ingest`
 * (`backend/API.md` § 3), texte déjà extrait côté client. Mode mock : multipart vers MSW.
 */
export function uploadDocument(
  kind: DocumentKind,
  input: {
    file: File;
    chunks: readonly ExtractedChunk[];
    metadata: DocumentMetadata;
    uploadedById: string;
    assigneeId?: string;
  },
) {
  const { metadata } = input;
  const title = metadata.title.trim();
  const summary = metadata.summary.trim() || undefined;
  const publishedAt = metadata.publishedDate ? `${metadata.publishedDate}T00:00:00` : undefined;

  if (isBackendLive) {
    return backend.ingestDocument(
      INGEST_PATHS[kind],
      {
        text: chunksToText(input.chunks),
        title,
        domain: metadata.domain,
        language: metadata.language,
        summary,
        created_by: input.uploadedById,
        published_at: publishedAt,
      },
      input.assigneeId,
    );
  }

  const formData = new FormData();
  formData.append("file", input.file);
  // Nom envoyé explicitement : certains runtimes ne conservent pas le nom du fichier
  // dans la partie multipart, ce qui fausserait le contrôle d'extension.
  formData.append("file_name", input.file.name);
  formData.append("title", title);
  formData.append("domain", metadata.domain);
  formData.append("language", metadata.language);
  if (summary) formData.append("summary", summary);
  if (publishedAt) formData.append("published_at", publishedAt);
  if (input.assigneeId) formData.append("assignee_id", input.assigneeId);
  formData.append("uploaded_by_id", input.uploadedById);
  formData.append("extracted_chunks", JSON.stringify(input.chunks));

  return apiFetch(MOCK_PATHS[kind], documentMetaSchema, { method: "POST", formData });
}
