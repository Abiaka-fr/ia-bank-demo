import { z } from "zod";

import { loginResponseSchema, userSchema, type LoginBody } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Connexion. Le backend fait autorité : route `signin` (et non `login`), vrai JWT
 * renvoyé dans `access_token`. En mode mock, on reste sur la simulation du contrat.
 */
export function login(body: LoginBody) {
  if (isBackendLive) return backend.signIn(body);
  return apiFetch("/api/auth/login", loginResponseSchema, {
    method: "POST",
    body,
  });
}

/**
 * Le backend n'expose pas de déconnexion : un JWT n'est pas révocable côté serveur, on
 * se contente d'oublier le jeton localement (fait par le `SessionProvider`).
 */
export function logout() {
  if (isBackendLive) return Promise.resolve({ ok: true } as const);
  return apiFetch("/api/auth/logout", z.object({ ok: z.literal(true) }), {
    method: "POST",
  });
}

/**
 * Liste des utilisateurs assignables. `GET /api/users` n'existe pas côté backend
 * (question ouverte n°6 de `docs/backend-integration.md`) : servi par MSW dans les
 * deux modes, sinon l'assignation et l'escalade n'auraient personne à proposer.
 */
export function fetchUsers() {
  return apiFetch("/api/users", z.array(userSchema));
}
