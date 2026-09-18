/**
 * Extraction du contenu d'un fichier Word (.docx) ou Excel (.xlsx) **côté client**,
 * avant tout appel réseau — demande de Thư (2026-09-14) : la vraie route de création
 * de document n'existe pas encore côté backend (`docs/api-requests.md` #2/#8), donc le
 * frontend prépare déjà le contenu extrait, prêt à être envoyé dès que la route
 * existera.
 *
 * Forme du résultat volontairement alignée sur le seul endpoint réel qui manipule du
 * contenu de document aujourd'hui, `POST /api/documents/{id}/update`
 * (`backend/API.md`) : un tableau de chunks `{ chunk_no, section_title, content }`.
 * Brancher la future route de création ne demandera donc pas de repenser la forme des
 * données, seulement d'envoyer ce qui est déjà produit ici.
 *
 * Aucun appel réseau ici — uniquement de la lecture locale (`File.arrayBuffer()`) via
 * `mammoth` (.docx) et `xlsx`/SheetJS (.xlsx), deux bibliothèques éprouvées plutôt
 * qu'un parseur maison (règle « chercher avant de créer », `frontend/CLAUDE.md`).
 */
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export type ExtractedChunk = {
  chunk_no: number;
  section_title: string;
  content: string;
};

const DOCX_EXTENSION = ".docx";
const XLSX_EXTENSION = ".xlsx";

export const ACCEPTED_UPLOAD_EXTENSIONS = [DOCX_EXTENSION, XLSX_EXTENSION] as const;

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export function isAcceptedUploadFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_UPLOAD_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Retire l'extension acceptée, quelle qu'elle soit — pour dériver un titre du nom de fichier. */
export function stripAcceptedExtension(fileName: string): string {
  const match = ACCEPTED_UPLOAD_EXTENSIONS.find((extension) =>
    fileName.toLowerCase().endsWith(extension),
  );
  return match ? fileName.slice(0, -match.length) : fileName;
}

export class UnsupportedFileFormatError extends Error {
  constructor(readonly fileName: string) {
    super(`Format non pris en charge pour l'extraction : ${fileName}`);
    this.name = "UnsupportedFileFormatError";
  }
}

/** Même libellé que l'exemple de chunk dans `backend/API.md` (« Document Header »). */
const DEFAULT_SECTION_TITLE = "Document Header";
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
/** Blocs porteurs de texte ; `div`/`table`/`ul` ne sont que des conteneurs de mise en page. */
const TEXT_BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,td,th";
/** Titres du Journal officiel de l'UE (`oj-ti-art`, `oj-ti-section-1`…) : des `<p>`, pas des `<h*>`. */
const EUR_LEX_HEADING_CLASS = /\boj-ti-/;

/** Texte propre du bloc, sans celui des blocs imbriqués (`<li>` parent, `<td><p>`), lus à leur tour. */
function ownText(node: Element): string {
  const clone = node.cloneNode(true) as Element;
  clone.querySelectorAll(TEXT_BLOCKS).forEach((nested) => nested.remove());
  return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Découpe du HTML (converti par mammoth, ou embarqué en altChunk) en sections à chaque
 * titre — un chunk par titre, le texte avant le premier titre forme le chunk d'en-tête.
 * Parcourt tous les blocs de texte, pas seulement les enfants directs de `<body>` : le
 * HTML EUR-Lex imbrique tout dans des `div`/`table`, qui sortaient en un seul bloc.
 * `DOMParser` est natif en navigateur comme sous `jsdom` (environnement de test).
 */
export function splitHtmlIntoChunks(html: string): ExtractedChunk[] {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const chunks: ExtractedChunk[] = [];
  let currentTitle = DEFAULT_SECTION_TITLE;
  let currentParagraphs: string[] = [];

  function flush() {
    const content = currentParagraphs.join("\n\n").trim();
    if (content) {
      chunks.push({ chunk_no: chunks.length + 1, section_title: currentTitle, content });
    }
    currentParagraphs = [];
  }

  for (const node of Array.from(parsed.body.querySelectorAll(TEXT_BLOCKS))) {
    const text = ownText(node);
    if (!text) continue;

    if (HEADING_TAGS.has(node.tagName) || EUR_LEX_HEADING_CLASS.test(node.className)) {
      flush();
      currentTitle = text;
    } else {
      currentParagraphs.push(text);
    }
  }
  flush();

  return chunks;
}

/**
 * Parties HTML du paquet .docx (cibles des `w:altChunk`), lues avec le CFB de `xlsx` —
 * celui qui écrit ce zip dans `eu-search/docx.ts`.
 * ponytail: UTF-8 supposé (vrai pour nos exports) ; lire le `charset` si un autre outil en produit.
 */
export function altChunkHtml(buffer: ArrayBuffer): string {
  // `CFB` est typé `any` par `xlsx` : seule la forme lue ici est déclarée.
  const zip: { FileIndex: { name: string; content: ArrayLike<number> }[] } = XLSX.CFB.read(
    new Uint8Array(buffer),
    { type: "array" },
  );
  return zip.FileIndex.filter((entry) => /\.x?html?$/i.test(entry.name))
    .map((entry) => new TextDecoder().decode(new Uint8Array(entry.content)))
    .join("\n");
}

async function extractDocxChunks(buffer: ArrayBuffer): Promise<ExtractedChunk[]> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const chunks = splitHtmlIntoChunks(html);
  if (chunks.length > 0) return chunks;

  // Contenu embarqué en `w:altChunk` HTML (ex. les .docx de la recherche UE,
  // `eu-search/docx.ts`) : Word le convertit à l'ouverture, mammoth l'ignore.
  const altChunks = splitHtmlIntoChunks(altChunkHtml(buffer));
  if (altChunks.length > 0) return altChunks;

  // Document sans titre détectable (rare) : retombe sur le texte brut plutôt que de
  // renvoyer un tableau vide.
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const trimmed = text.trim();
  return trimmed ? [{ chunk_no: 1, section_title: DEFAULT_SECTION_TITLE, content: trimmed }] : [];
}

/** Une feuille = un chunk, la ligne d'en-tête et les cellules vides ne sont pas conservées. */
function extractXlsxChunks(buffer: ArrayBuffer): ExtractedChunk[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((sheetName, index) => ({
    chunk_no: index + 1,
    section_title: sheetName,
    content: XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false }).trim(),
  })).filter((chunk) => chunk.content.length > 0);
}

/**
 * Point d'entrée unique : détecte le format par extension et renvoie le contenu
 * découpé en chunks. Lève `UnsupportedFileFormatError` pour tout format hors
 * `ACCEPTED_UPLOAD_EXTENSIONS` — l'appelant est censé avoir déjà filtré via
 * `isAcceptedUploadFile`, cette erreur est un garde-fou, pas le chemin normal.
 */
/**
 * `file.arrayBuffer()` directement dans un vrai navigateur (API standard) ; repli
 * `FileReader` pour `jsdom` (environnement de test, épinglé en v26 — voir
 * `frontend/CLAUDE.md` — dont le `File`/`Blob` shim ne l'implémente pas). Testé pour
 * préserver le contenu binaire exact (`Response(blob).arrayBuffer()` corrompait les
 * octets non-ASCII d'un vrai `.xlsx` sous ce shim, `FileReader` non).
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsArrayBuffer(file);
  });
}

export async function extractFileChunks(file: File): Promise<ExtractedChunk[]> {
  const name = file.name.toLowerCase();
  const buffer = await readFileAsArrayBuffer(file);

  if (name.endsWith(DOCX_EXTENSION)) return extractDocxChunks(buffer);
  if (name.endsWith(XLSX_EXTENSION)) return extractXlsxChunks(buffer);

  throw new UnsupportedFileFormatError(file.name);
}

/**
 * Pour un stockage à plat (ex. `DocumentDetail.extracted_text`). Le titre de section
 * devient un titre Markdown (format du corpus, rendu par `MarkdownLine`) : sans lui,
 * les intitulés d'articles disparaissaient du texte source. L'en-tête par défaut est
 * un libellé technique, pas un vrai titre — omis.
 */
export function chunksToText(chunks: readonly ExtractedChunk[]): string {
  return chunks
    .map((chunk) =>
      chunk.section_title && chunk.section_title !== DEFAULT_SECTION_TITLE
        ? `## ${chunk.section_title}\n\n${chunk.content}`
        : chunk.content,
    )
    .join("\n\n");
}
