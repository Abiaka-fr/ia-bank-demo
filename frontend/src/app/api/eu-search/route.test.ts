// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

function request(query: string) {
  return new NextRequest(`http://localhost:3000/api/eu-search?${query}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/eu-search", () => {
  it("renvoie 400 INVALID_PARAMS sans appeler CELLAR pour un paramètre invalide", async () => {
    // Arrange
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const response = await GET(request("page=99"));

    // Assert
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_PARAMS");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("interroge l'endpoint SPARQL CELLAR et renvoie les résultats mappés", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        results: {
          bindings: [
            {
              celex: { value: "32022R2554" },
              title: { value: "DORA" },
              date: { value: "2022-12-14" },
              type: {
                value: "http://publications.europa.eu/resource/authority/resource-type/REG",
              },
              inForce: { value: "1" },
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const response = await GET(request("q=resilience&lang=en"));

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [
        {
          celex: "32022R2554",
          title: "DORA",
          date: "2022-12-14",
          type: "REG",
          inForce: true,
          eurlexUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554",
        },
      ],
      page: 1,
      hasMore: false,
    });
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(`${calledUrl.origin}${calledUrl.pathname}`).toBe(
      "https://publications.europa.eu/webapi/rdf/sparql",
    );
    expect(calledUrl.searchParams.get("query")).toContain(`bif:contains "'resilience'"`);
  });

  it("renvoie 502 EU_SOURCE_UNAVAILABLE quand CELLAR répond 429", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 429 })));

    // Act
    const response = await GET(request(""));

    // Assert
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("EU_SOURCE_UNAVAILABLE");
  });

  it("renvoie 502 EU_SOURCE_UNAVAILABLE quand CELLAR est injoignable", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    // Act
    const response = await GET(request(""));

    // Assert
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("EU_SOURCE_UNAVAILABLE");
  });

  it("renvoie 502 EU_SOURCE_UNAVAILABLE quand CELLAR renvoie un corps illisible", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>maintenance</html>", { status: 200 })),
    );

    // Act
    const response = await GET(request(""));

    // Assert
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("EU_SOURCE_UNAVAILABLE");
  });
});
