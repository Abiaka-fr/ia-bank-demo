"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { LocaleToggle } from "./locale-toggle";
import { UserMenu } from "./user-menu";

export function TopBar() {
  const t = useTranslations("topBar");
  const app = useTranslations("app");

  return (
    <header className="sticky top-0 z-10 flex flex-col border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <span className="truncate text-sm font-medium">{app("shortName")}</span>
        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle />
          <UserMenu />
        </div>
      </div>
      {/* Rappel permanent du garde-fou produit : le système propose, l'humain tranche. */}
      <p className="flex items-center gap-2 border-t bg-muted/40 px-4 py-1.5 text-[11px] text-muted-foreground">
        <Info className="size-3.5 shrink-0" aria-hidden />
        {t("humanInTheLoop")}
      </p>
    </header>
  );
}
