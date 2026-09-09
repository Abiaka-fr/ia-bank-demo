"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

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
  adminNavItems,
  analysisNavItems,
  assistanceNavItems,
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

  return (
    <Sidebar collapsible="icon">
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
          items={analysisNavItems}
          pathname={pathname}
        />
        <NavGroup
          label={t("sectionAssistance")}
          items={assistanceNavItems}
          pathname={pathname}
        />
        <NavGroup
          label={t("sectionAdmin")}
          items={adminNavItems}
          pathname={pathname}
        />
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-1 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          {app("demoCorpus")}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
