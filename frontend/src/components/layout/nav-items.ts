import { LayoutDashboard, MessagesSquare, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Navigation principale — source unique pour la sidebar.
 *
 * v1.1 : « Analyse d'impact » et « Preuves » ne sont plus des écrans globaux ; ce sont
 * des onglets de la page de détail d'une régulation (on ne consulte des constats
 * qu'après avoir choisi la régulation concernée).
 */
export type NavItem = {
  href: string;
  labelKey: "dashboard" | "regulations" | "copilot";
  icon: LucideIcon;
};

export const analysisNavItems: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/regulations", labelKey: "regulations", icon: ScrollText },
];

export const assistanceNavItems: readonly NavItem[] = [
  { href: "/copilot", labelKey: "copilot", icon: MessagesSquare },
];
