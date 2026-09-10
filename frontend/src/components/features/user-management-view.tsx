"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { UserRoleRow } from "@/components/features/user-role-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsers } from "@/lib/api/use-users";

/**
 * Gestion des rôles utilisateurs (v1.5, `PUT /api/users/:id/role`). Limite assumée à
 * afficher honnêtement plutôt qu'à cacher : cette route n'a aucun contrôle
 * d'autorisation propre — n'importe quel compte connecté peut changer le rôle de
 * n'importe quel autre (voir `docs/backend-integration.md` point 12).
 */
export function UserManagementView() {
  const t = useTranslations("users");
  const usersQuery = useUsers();

  if (usersQuery.isPending) return <LoadingState rows={4} />;
  if (usersQuery.isError) {
    return (
      <ErrorState
        error={usersQuery.error}
        onRetry={() => void usersQuery.refetch()}
      />
    );
  }
  if (!usersQuery.data.length) return <EmptyState message={t("empty")} />;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t("permissionNotice")}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnFullName")}</TableHead>
            <TableHead>{t("columnEmail")}</TableHead>
            <TableHead>{t("columnRole")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersQuery.data.map((user) => (
            <UserRoleRow key={user.user_id} user={user} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
