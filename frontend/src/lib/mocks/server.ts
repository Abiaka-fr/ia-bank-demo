import { setupServer } from "msw/node";

/** Utilisé par les tests Vitest (Node), pas par l'application. */
export const server = setupServer();
