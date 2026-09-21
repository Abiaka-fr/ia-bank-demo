"use client";

import { useCallback, useState } from "react";

import { extractFileChunks, type ExtractedChunk } from "@/lib/file-extract";

export type FileExtractionStatus = "idle" | "extracting" | "done" | "error";

/**
 * État partagé par `UploadDocumentDialog` : un fichier déjà
 * validé (extension acceptée, vérifiée par l'appelant) est extrait côté client
 * (demande de Thư, 2026-09-14 — voir `lib/file-extract.ts`) avant tout appel réseau.
 * Un seul hook plutôt qu'une logique dupliquée dans les deux dialogues (règle
 * anti-duplication, `frontend/CLAUDE.md`).
 */
export function useFileExtraction() {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<readonly ExtractedChunk[]>([]);
  const [status, setStatus] = useState<FileExtractionStatus>("idle");

  /** `selected` est supposé déjà filtré par extension — ce hook ne fait qu'extraire. */
  const selectFile = useCallback((selected: File | null) => {
    setFile(selected);
    setChunks([]);

    if (!selected) {
      setStatus("idle");
      return;
    }

    setStatus("extracting");
    extractFileChunks(selected)
      .then((extracted) => {
        setChunks(extracted);
        setStatus("done");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setChunks([]);
    setStatus("idle");
  }, []);

  return { file, chunks, status, selectFile, reset };
}
