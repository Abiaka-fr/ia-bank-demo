import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** Utilisé par les tests Vitest (Node), pas par l'application. */
export const server = setupServer(...handlers);
