"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

const REGULATION_TABS = [
  "overview",
  "requirements",
  "actions",
  "source",
  "history",
] as const;

export type RegulationTab = (typeof REGULATION_TABS)[number];

function isRegulationTab(value: string | null): value is RegulationTab {
  return value !== null && (REGULATION_TABS as readonly string[]).includes(value);
}

/**
 * Onglet et élément mis en avant, portés par l'URL.
 *
 * Passer par l'URL (`?tab=…&focus=…`) plutôt que par un état local rend chaque vue
 * partageable et permet à la carte mentale du tableau de bord de pointer directement
 * sur une exigence ou un constat.
 */
export function useRegulationTab(fallback: RegulationTab) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const requested = searchParams.get("tab");
  const tab: RegulationTab = isRegulationTab(requested) ? requested : fallback;
  const focus = searchParams.get("focus");

  function setTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    // Changer d'onglet à la main annule la mise en avant venue d'un lien.
    params.delete("focus");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { tab, focus, setTab };
}
