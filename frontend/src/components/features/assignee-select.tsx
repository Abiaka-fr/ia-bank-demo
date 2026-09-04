"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/lib/api/use-users";

/** Sélecteur de la personne chargée du traitement (régulation ou constat escaladé). */
export function AssigneeSelect({
  value,
  onChange,
  disabled,
  size = "sm",
  className,
}: {
  value: string | undefined;
  onChange: (userId: string) => void;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("assignee");
  const { data: users, isPending } = useUsers();

  if (isPending) return <Skeleton className="h-8 w-44" />;

  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size={size} aria-label={t("label")} className={className}>
        <UserRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue placeholder={t("unassigned")} />
      </SelectTrigger>
      <SelectContent>
        {users?.map((user) => (
          <SelectItem key={user.user_id} value={user.user_id}>
            {user.full_name} — {user.role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Affiche le nom d'un utilisateur à partir de son identifiant. */
export function AssigneeName({ userId }: { userId: string | undefined }) {
  const t = useTranslations("assignee");
  const { data: users } = useUsers();

  if (!userId) return <span className="text-muted-foreground">{t("unassigned")}</span>;

  const user = users?.find((candidate) => candidate.user_id === userId);
  return <span>{user?.full_name ?? userId}</span>;
}
