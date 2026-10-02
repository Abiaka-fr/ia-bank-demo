"use client";

import { useEffect } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { useSession } from "@/components/providers/session-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchMe } from "@/lib/api/auth";
import {
  accessProfileForUser,
  canSeeKnowledgeBase,
  canSeeUserAdmin,
  landingRouteForUser,
} from "@/lib/access-profile";

/**
 * Redirige vers l'écran de connexion tant qu'aucun utilisateur n'est en session.
 *
 * Garde-fou d'expérience, pas de sécurité : la session vit dans le navigateur et
 * l'authentification réelle reste à construire côté backend.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady, updateUser } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const userId = user?.user_id;
  const role = user?.role;

  // À chaque changement de page : un rôle modifié par un admin s'applique sans
  // déconnexion. Échec (réseau, 401) ignoré — le client purge déjà un jeton expiré.
  useEffect(() => {
    if (!userId) return;
    fetchMe()
      .then((me) => {
        if (me && me.role !== role) updateUser(me);
      })
      .catch(() => {});
    // `role` exclu : on ne relance pas l'appel juste parce qu'on vient de le mettre à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, updateUser]);
  // La sidebar masque ces écrans, mais une URL tapée à la main y menait quand même.
  const profile = accessProfileForUser(user);
  const forbidden =
    (pathname.startsWith("/users") && !canSeeUserAdmin(profile)) ||
    (pathname.startsWith("/knowledge-base") && !canSeeKnowledgeBase(profile));

  useEffect(() => {
    // À l'hydratation la session n'est pas encore lue : rediriger ici renvoyait tout
    // rechargement ou lien direct vers la page d'atterrissage.
    if (!isReady) return;
    if (!user) router.replace("/login");
    else if (forbidden) router.replace(landingRouteForUser(user));
  }, [isReady, user, forbidden, router]);

  if (!user || forbidden) {
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
