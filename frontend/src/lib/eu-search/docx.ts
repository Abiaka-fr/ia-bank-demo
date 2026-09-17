import { CFB } from "xlsx";

/**
 * Emballe une page HTML dans un .docx minimal : le corps du document ne contient qu'un
 * `w:altChunk` pointant vers le HTML, que Word convertit lui-même à l'ouverture.
 * Zip écrit par le CFB de SheetJS (`xlsx`, déjà installé) — aucune dépendance ajoutée.
 *
 * ponytail: altChunk = conversion déléguée au logiciel qui ouvre le fichier — vérifié dans
 * Word et LibreOffice le 2026-09-17 ; Google Docs et les aperçus rapides n'affichent rien.
 * Passer à une vraie conversion HTML → OOXML (ex. `html-to-docx`) s'il faut les couvrir.
 */
const FILES: Record<string, string> = {
  "[Content_Types].xml":
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="html" ContentType="text/html"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    "</Types>",
  "_rels/.rels":
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships>",
  "word/_rels/document.xml.rels":
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="source" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="source.html"/>' +
    "</Relationships>",
  // Page A4, marges 2 cm : format du Journal officiel de l'UE.
  "word/document.xml":
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<w:body><w:altChunk r:id="source"/>' +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>' +
    "</w:body></w:document>",
};

export function htmlToDocx(html: string): Buffer {
  const zip = CFB.utils.cfb_new();
  for (const [path, content] of Object.entries(FILES)) {
    CFB.utils.cfb_add(zip, path, Buffer.from(content, "utf8"));
  }
  // Prologue `<?xml …?>` des textes XHTML retiré : Word déclare sinon le fichier corrompu
  // (vérifié sur 32022R2554). BOM ajouté : certains anciens textes déclarent un charset
  // exotique (`UNICODE-1-1-UTF-8`) que Word ne reconnaît pas — le BOM impose l'UTF-8.
  const source = String.fromCharCode(0xfeff) + html.replace(/^\s*<\?xml[^>]*\?>/, "");
  CFB.utils.cfb_add(zip, "word/source.html", Buffer.from(source, "utf8"));
  return CFB.write(zip, { type: "buffer", fileType: "zip", compression: true }) as Buffer;
}
