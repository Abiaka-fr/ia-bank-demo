"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchUsers } from "./auth";
import { queryKeys } from "./query-keys";

/** Liste des utilisateurs assignables, partagée par tous les sélecteurs d'assignation. */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: fetchUsers,
    // La liste bouge très peu : inutile de la recharger à chaque écran.
    staleTime: 5 * 60_000,
  });
}
