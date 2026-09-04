import { z } from "zod";

import { loginResponseSchema, userSchema, type LoginBody } from "@/types/api";

import { apiFetch } from "./client";

export function login(body: LoginBody) {
  return apiFetch("/api/auth/login", loginResponseSchema, {
    method: "POST",
    body,
  });
}

export function logout() {
  return apiFetch("/api/auth/logout", z.object({ ok: z.literal(true) }), {
    method: "POST",
  });
}

export function fetchUsers() {
  return apiFetch("/api/users", z.array(userSchema));
}
