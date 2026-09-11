"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSession } from "@/components/providers/session-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import {
  accessProfileForUser,
  canSeeKnowledgeBase,
  canSeeUserAdmin,
} from "@/lib/access-profile";

import {
  adminNavItems,
  analysisNavItems,
  assistanceNavItems,
  knowledgeBaseNavItem,
  type NavItem,
} from "./nav-items";

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: readonly NavItem[];
  pathname: string;
}) {
  const t = useTranslations("nav");

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              >
                <Link href={item.href}>
                  <item.icon aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const t = useTranslations("nav");
  const app = useTranslations("app");
  const pathname = usePathname();
  const { user } = useSession();
  // Profil d'accès 100 % frontend — masquer, pas griser (retour Francis, voir
  // docs/phases/phase-6-francis-feedback.md § 1) : un profil qui ne gère pas les
  // utilisateurs ne voit tout simplement pas la section Administration.
  const profile = accessProfileForUser(user);
  const showAdmin = canSeeUserAdmin(profile);
  const showKnowledgeBase = canSeeKnowledgeBase(profile);
  const analysisItems = showKnowledgeBase
    ? [...analysisNavItems, knowledgeBaseNavItem]
    : analysisNavItems;

  return (
    // print:hidden : la navigation n'a pas sa place sur un document imprimé
    // (Phase 6 § 5).
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <ShieldCheck className="size-5 shrink-0" aria-hidden />
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {app("shortName")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup
          label={t("sectionAnalysis")}
          items={analysisItems}
          pathname={pathname}
        />
        <NavGroup
          label={t("sectionAssistance")}
          items={assistanceNavItems}
          pathname={pathname}
        />
        {showAdmin ? (
          <NavGroup
            label={t("sectionAdmin")}
            items={adminNavItems}
            pathname={pathname}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-1 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          {app("demoCorpus")}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
