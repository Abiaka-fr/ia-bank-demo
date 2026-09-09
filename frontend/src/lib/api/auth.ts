import { z } from "zod";

import { loginResponseSchema, type LoginBody, type SignupBody } from "@/types/api";

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
 * Création de compte (v1.4). Réponse identique à `login` — un compte tout juste créé
 * est aussitôt connecté. Le rôle est fixé automatiquement à la création ; pour le
 * changer ensuite, voir `updateUserRole` (`./users.ts`, v1.5).
 */
export function signUp(body: SignupBody) {
  if (isBackendLive) return backend.signUp(body);
  return apiFetch("/api/auth/signup", loginResponseSchema, {
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
