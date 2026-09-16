import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  chunksToText,
  extractFileChunks,
  isAcceptedUploadFile,
  splitHtmlIntoChunks,
  stripAcceptedExtension,
  UnsupportedFileFormatError,
} from "./file-extract";

// Pas de mock de `mammoth` ici : dans cet environnement de test (Vitest + jsdom),
// `vi.mock("mammoth", ...)` n'intercepte pas l'import transitif fait depuis
// `file-extract.ts` (vérifié — le vrai `mammoth.convertToHtml` s'exécute quand même,
// échoue sur un faux binaire). La logique intéressante à tester (le découpage en
// chunks) est déjà isolée dans `splitHtmlIntoChunks`, une fonction pure testée
// directement ci-dessous — la fine enveloppe autour de `mammoth` elle-même
// (`extractDocxChunks`, non exportée) n'a pas besoin de son propre test.

function makeXlsxFile(sheets: Record<string, string[][]>): File {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const buffer: Uint8Array = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer as BlobPart], "corpus.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("isAcceptedUploadFile", () => {
  it("accepte .docx et .xlsx (insensible à la casse), rejette le reste", () => {
    // Arrange / Act / Assert
    expect(isAcceptedUploadFile("procedure.docx")).toBe(true);
    expect(isAcceptedUploadFile("registre.XLSX")).toBe(true);
    expect(isAcceptedUploadFile("note.pdf")).toBe(false);
  });
});

describe("stripAcceptedExtension", () => {
  it("retire l'extension quel que soit le format accepté", () => {
    // Arrange / Act / Assert
    expect(stripAcceptedExtension("Procedure KYC.docx")).toBe("Procedure KYC");
    expect(stripAcceptedExtension("Registre des contrôles.xlsx")).toBe(
      "Registre des contrôles",
    );
  });
});

describe("splitHtmlIntoChunks", () => {
  it("découpe en un chunk par titre, le texte avant le premier titre forme l'en-tête", () => {
    // Arrange
    const html =
      "<p>Intro text.</p><h1>Purpose</h1><p>Text one.</p><h2>Scope</h2><p>Text two.</p>";

    // Act
    const chunks = splitHtmlIntoChunks(html);

    // Assert
    expect(chunks).toEqual([
      { chunk_no: 1, section_title: "Document Header", content: "Intro text." },
      { chunk_no: 2, section_title: "Purpose", content: "Text one." },
      { chunk_no: 3, section_title: "Scope", content: "Text two." },
    ]);
  });

  it("regroupe plusieurs paragraphes sous le même titre", () => {
    // Arrange
    const html = "<h1>Purpose</h1><p>First.</p><p>Second.</p>";

    // Act
    const chunks = splitHtmlIntoChunks(html);

    // Assert
    expect(chunks).toEqual([
      { chunk_no: 1, section_title: "Purpose", content: "First.\n\nSecond." },
    ]);
  });

  it("ignore les titres et paragraphes vides", () => {
    // Arrange
    const html = "<h1></h1><h2>Scope</h2><p></p><p>Only content.</p>";

    // Act
    const chunks = splitHtmlIntoChunks(html);

    // Assert : le `<h1>` vide n'a jamais ouvert de section, `Scope` reste le titre courant.
    expect(chunks).toEqual([
      { chunk_no: 1, section_title: "Scope", content: "Only content." },
    ]);
  });

  it("renvoie un tableau vide pour un document sans aucun contenu", () => {
    expect(splitHtmlIntoChunks("<h1></h1><p></p>")).toEqual([]);
  });
});

describe("extractFileChunks", () => {
  it("découpe un .xlsx en un chunk par feuille non vide", async () => {
    // Arrange
    const file = makeXlsxFile({
      Controls: [
        ["Control", "Owner"],
        ["KYC review", "Compliance"],
      ],
      Empty: [],
    });

    // Act
    const chunks = await extractFileChunks(file);

    // Assert : la feuille vide n'a produit aucun contenu, elle est filtrée.
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ chunk_no: 1, section_title: "Controls" });
    expect(chunks[0].content).toContain("Control,Owner");
    expect(chunks[0].content).toContain("KYC review,Compliance");
  });

  it("lève UnsupportedFileFormatError pour un format hors .docx/.xlsx", async () => {
    // Arrange
    const file = new File([new Uint8Array([1])], "note.pdf");

    // Act + Assert
    await expect(extractFileChunks(file)).rejects.toBeInstanceOf(
      UnsupportedFileFormatError,
    );
  });
});

describe("chunksToText", () => {
  it("joint le contenu des chunks avec une ligne vide", () => {
    // Arrange
    const chunks = [
      { chunk_no: 1, section_title: "A", content: "one" },
      { chunk_no: 2, section_title: "B", content: "two" },
    ];

    // Act / Assert
    expect(chunksToText(chunks)).toBe("one\n\ntwo");
  });

  it("renvoie une chaîne vide pour un tableau vide", () => {
    expect(chunksToText([])).toBe("");
  });
});
