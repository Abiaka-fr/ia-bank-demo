import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { htmlToDocx } from "./eu-search/docx";
import {
  altChunkHtml,
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

  it("lit les blocs imbriqués (HTML EUR-Lex) et ses titres d'article en <p class=oj-ti-art>", () => {
    // Arrange : tout est dans des div/table, comme le texte réel d'un acte UE.
    const html =
      '<table><tr><td><p class="oj-hd-ti">Journal officiel <br/>de l\'UE</p></td></tr></table>' +
      '<div class="eli-container"><div><p class="oj-ti-art">Article premier</p>' +
      '<p class="oj-normal">Texte\n   de l\'article.</p>' +
      "<ul><li>Point a<ul><li>sous-point</li></ul></li></ul></div></div>";

    // Act
    const chunks = splitHtmlIntoChunks(html);

    // Assert : un bloc par paragraphe, le texte d'un <li> parent n'est pas perdu.
    expect(chunks).toEqual([
      { chunk_no: 1, section_title: "Document Header", content: "Journal officiel de l'UE" },
      {
        chunk_no: 2,
        section_title: "Article premier",
        content: "Texte de l'article.\n\nPoint a\n\nsous-point",
      },
    ]);
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

  it("lit le HTML altChunk d'un .docx exporté par la recherche UE", () => {
    // Arrange : même fonction que le bouton « Télécharger (.docx) ». `extractFileChunks`
    // n'est pas appelé : sous Vitest, mammoth charge sa version Node, qui refuse
    // `arrayBuffer` (voir en tête de fichier) — parcours complet vérifié en navigateur.
    const html =
      '<?xml version="1.0"?><html><body><p class="oj-doc-ti">RÈGLEMENT (UE) 2026/1867</p>' +
      '<p class="oj-ti-art">Article premier</p><p class="oj-normal">Le règlement est modifié.</p></body></html>';
    const docx = new Uint8Array(htmlToDocx(html)).buffer;

    // Act
    const chunks = splitHtmlIntoChunks(altChunkHtml(docx));

    // Assert
    expect(chunks).toEqual([
      { chunk_no: 1, section_title: "Document Header", content: "RÈGLEMENT (UE) 2026/1867" },
      { chunk_no: 2, section_title: "Article premier", content: "Le règlement est modifié." },
    ]);
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
  it("garde les titres de section en titres Markdown, sauf l'en-tête par défaut", () => {
    // Arrange
    const chunks = [
      { chunk_no: 1, section_title: "Document Header", content: "intro" },
      { chunk_no: 2, section_title: "Article 1", content: "one" },
    ];

    // Act / Assert
    expect(chunksToText(chunks)).toBe("intro\n\n## Article 1\n\none");
  });

  it("renvoie une chaîne vide pour un tableau vide", () => {
    expect(chunksToText([])).toBe("");
  });
});
