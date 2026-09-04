import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/lib/mocks/server";
import { resetStore } from "@/lib/mocks/store";

// Les tests tapent sur les mêmes handlers MSW que l'application : si le contrat
// d'API change, ils cassent au même endroit que le frontend.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetStore();
});

afterAll(() => server.close());
