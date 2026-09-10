"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { queryKeys } from "@/lib/api/query-keys";
import { updateUserRole } from "@/lib/api/users";
import type { User } from "@/types/api";

/**
 * `role` reste une chaîne libre côté backend (pas d'énumération, voir
 * `backend/app/schemas/user.py`) — un champ texte plutôt qu'une liste déroulante
 * n'invente donc pas de valeurs qui n'existent pas.
 */
export function UserRoleRow({ user }: { user: User }) {
  const t = useTranslations("users");
  const queryClient = useQueryClient();
  const [role, setRole] = useState(user.role);

  const mutation = useMutation({
    mutationFn: () => updateUserRole(user.user_id, { role: role.trim() }),
    onSuccess: async () => {
      toast.success(t("saved"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const isUnchanged = role.trim() === user.role || role.trim() === "";

  return (
    <TableRow>
      <TableCell className="whitespace-normal font-medium">{user.full_name}</TableCell>
      <TableCell className="whitespace-normal text-muted-foreground">{user.email}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-2">
          <Input
            id={`role-${user.user_id}`}
            name={`role-${user.user_id}`}
            aria-label={t("roleLabel", { name: user.full_name })}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-8 max-w-56"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isUnchanged || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("save")}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
