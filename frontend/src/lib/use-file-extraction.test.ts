import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { extractFileChunks, type ExtractedChunk } from "@/lib/file-extract";

import { useFileExtraction } from "./use-file-extraction";

vi.mock("@/lib/file-extract", () => ({ extractFileChunks: vi.fn() }));

const chunk = (content: string): ExtractedChunk => ({ chunk_no: 1, section_title: "S", content });

it("ignore une extraction qui se termine après le choix d'un autre fichier", async () => {
  const finish = new Map<string, (chunks: ExtractedChunk[]) => void>();
  vi.mocked(extractFileChunks).mockImplementation(
    (file) => new Promise((resolve) => finish.set(file.name, resolve)),
  );
  const { result } = renderHook(() => useFileExtraction());

  act(() => {
    result.current.selectFile(new File(["a"], "a.docx"));
    result.current.selectFile(new File(["b"], "b.docx"));
  });
  // Le premier fichier, plus lent, se termine en dernier.
  await act(async () => {
    finish.get("b.docx")?.([chunk("B")]);
    finish.get("a.docx")?.([chunk("A")]);
  });

  expect(result.current.file?.name).toBe("b.docx");
  expect(result.current.chunks).toEqual([chunk("B")]);
  expect(result.current.status).toBe("done");
});
