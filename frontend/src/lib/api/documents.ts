import { documentDetailSchema } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Fetch full document content (extracted text) by document ID.
 */
export function fetchDocumentContent(documentId: string) {
  if (isBackendLive) return backend.fetchDocumentDetail(documentId);

  return apiFetch(`/api/documents/${documentId}`, documentDetailSchema);
}
