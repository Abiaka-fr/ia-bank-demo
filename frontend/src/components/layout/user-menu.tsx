"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOut, User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/api/auth";

export function UserMenu() {
  const t = useTranslations("topBar");
  const { user, signOut } = useSession();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: logout,
    // Même si l'appel échoue, on termine la session locale : rester connecté
    // malgré un clic explicite sur « Se déconnecter » serait plus surprenant.
    onSettled: () => {
      signOut();
      router.replace("/login");
    },
  });

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserIcon className="size-4" aria-hidden />
          <span className="hidden max-w-40 truncate sm:inline">
            {user.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <LogOut aria-hidden />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
