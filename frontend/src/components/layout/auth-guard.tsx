"use client";

import { useEffect } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { useSession } from "@/components/providers/session-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";

/**
 * Redirige vers l'écran de connexion tant qu'aucun utilisateur n'est en session.
 *
 * Garde-fou d'expérience, pas de sécurité : la session vit dans le navigateur et
 * l'authentification réelle reste à construire côté backend.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <TopBar />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
