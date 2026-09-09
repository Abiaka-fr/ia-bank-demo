import { z } from "zod";

import { userSchema, type UpdateUserRoleBody } from "@/types/api";

import { isBackendLive } from "./backend/config";
import * as backend from "./backend/resources";
import { apiFetch } from "./client";

/**
 * Liste des utilisateurs assignables. `GET /api/users` existe côté backend depuis le
 * 2026-09-07 (commit `624db76`) — question ouverte n°6 de
 * `docs/backend-integration.md`, résolue.
 */
export function fetchUsers() {
  if (isBackendLive) return backend.fetchUsers();
  return apiFetch("/api/users", z.array(userSchema));
}

/**
 * Change le rôle d'un compte (v1.5, `PUT /api/users/:id/role`) — répond au point resté
 * ouvert en v1.4 : ni `signup` ni aucune autre route ne permettait jusqu'ici de choisir
 * ou de changer `User.role`. **Limite assumée** : la route n'a aucun contrôle
 * d'autorisation propre — n'importe quel compte authentifié peut changer le rôle de
 * n'importe quel autre, voir `docs/backend-integration.md`.
 */
export function updateUserRole(userId: string, body: UpdateUserRoleBody) {
  if (isBackendLive) return backend.updateUserRole(userId, body);
  return apiFetch(`/api/users/${encodeURIComponent(userId)}/role`, userSchema, {
    method: "PUT",
    body,
  });
}
