// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CFB } from "xlsx";

import { GET } from "./route";

function request(query: string) {
  return new NextRequest(`http://localhost:3000/api/eu-document?${query}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/eu-document", () => {
  it("refuse un CELEX invalide sans appeler CELLAR", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request("celex=32022R2554%22%3E"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("transmet le HTML CELLAR dans la langue demandée, sous CSP sandbox", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html><body>DORA</body></html>"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request("celex=celex:32022r2554&lang=en"));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://publications.europa.eu/resource/celex/32022R2554");
    expect(init.headers["Accept-Language"]).toBe("eng, fra;q=0.5");
    expect(response.headers.get("Content-Security-Policy")).toMatch(/^sandbox;/);
    expect(await response.text()).toContain("DORA");
  });

  it("renvoie 404 quand CELLAR n'a pas de texte pour cet acte", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

    const response = await GET(request("celex=32022R2554"));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("EU_DOCUMENT_NOT_FOUND");
  });

  it("emballe le HTML, sans prologue XML, dans un .docx qui pointe vers lui (altChunk)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('<?xml version="1.0"?><html><body>Déjà</body></html>')),
    );

    const response = await GET(request("celex=32022R2554&format=docx"));

    expect(response.headers.get("Content-Disposition")).toContain('filename="32022R2554_FR.docx"');
    const zip = CFB.read(Buffer.from(await response.arrayBuffer()), { type: "buffer" });
    const text = (path: string) =>
      Buffer.from(CFB.find(zip, `/${path}`)!.content as Uint8Array).toString("utf8");
    expect(text("word/document.xml")).toContain('<w:altChunk r:id="source"/>');
    expect(text("word/_rels/document.xml.rels")).toContain('Target="source.html"');
    expect(text("word/source.html")).toBe(String.fromCharCode(0xfeff) + "<html><body>Déjà</body></html>");
  });
});
