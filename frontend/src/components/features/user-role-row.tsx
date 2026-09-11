"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { KNOWN_ROLES, roleLabel } from "@/lib/access-profile";
import { queryKeys } from "@/lib/api/query-keys";
import { updateUserRole } from "@/lib/api/users";
import type { User } from "@/types/api";

/**
 * `role` reste une chaîne libre côté backend (pas d'énumération, voir
 * `backend/app/schemas/user.py`) — mais côté frontend, chaque rôle pilote un profil
 * d'accès précis (`lib/access-profile.ts`, Phase 6 § 1). La liste déroulante ne propose
 * donc que les libellés reconnus : un choix dans la liste correspond toujours à un
 * profil sans ambiguïté, plutôt qu'un texte libre qui pourrait retomber sur le profil
 * par défaut sans que la personne s'en rende compte.
 *
 * Si le rôle actuel n'est pas dans la liste connue (compte créé avant cette liste, ou
 * rôle saisi à la main avant ce changement), il reste affiché comme option
 * supplémentaire pour ne pas le faire disparaître silencieusement.
 */
export function UserRoleRow({ user }: { user: User }) {
  const t = useTranslations("users");
  const rolesT = useTranslations("roles");
  const queryClient = useQueryClient();

  const isKnownRole = KNOWN_ROLES.some((entry) => entry.role === user.role);
  const roleOptions = isKnownRole
    ? KNOWN_ROLES
    : [{ role: user.role, profile: null }, ...KNOWN_ROLES];

  const mutation = useMutation({
    mutationFn: (nextRole: string) => updateUserRole(user.user_id, { role: nextRole }),
    onSuccess: async () => {
      toast.success(t("saved"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  return (
    <TableRow>
      <TableCell className="whitespace-normal font-medium">{user.full_name}</TableCell>
      <TableCell className="whitespace-normal text-muted-foreground">{user.email}</TableCell>
      <TableCell className="whitespace-normal">
        <Select
          value={user.role}
          onValueChange={(nextRole) => mutation.mutate(nextRole)}
          disabled={mutation.isPending}
        >
          <SelectTrigger
            id={`role-${user.user_id}`}
            aria-label={t("roleLabel", { name: user.full_name })}
            className="h-8 max-w-64"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.role} value={option.role}>
                {roleLabel(option.role, rolesT)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}
