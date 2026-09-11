import {
  ClipboardList,
  LayoutDashboard,
  Library,
  MessagesSquare,
  ScrollText,
  Users,
} from "lucide-react";
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
  labelKey:
    | "dashboard"
    | "regulations"
    | "procedures"
    | "copilot"
    | "users"
    | "knowledgeBase";
  icon: LucideIcon;
};

/** `/procedures` (Phase 6 § 2.2 / Phase 7 Jour 0) — même visibilité que `/regulations`. */
export const analysisNavItems: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/regulations", labelKey: "regulations", icon: ScrollText },
  { href: "/procedures", labelKey: "procedures", icon: ClipboardList },
];

/** Phase 6 § 3 — visible seulement pour `COMPLIANCE_ADMIN`/`HEAD_OF_COMPLIANCE`. */
export const knowledgeBaseNavItem: NavItem = {
  href: "/knowledge-base",
  labelKey: "knowledgeBase",
  icon: Library,
};

export const assistanceNavItems: readonly NavItem[] = [
  { href: "/copilot", labelKey: "copilot", icon: MessagesSquare },
];

/** v1.5 — gestion des rôles utilisateurs (`PUT /api/users/:id/role`). */
export const adminNavItems: readonly NavItem[] = [
  { href: "/users", labelKey: "users", icon: Users },
];
