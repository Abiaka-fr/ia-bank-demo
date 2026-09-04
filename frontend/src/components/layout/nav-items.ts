import {
  FileSearch,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Les 5 écrans du produit — source unique pour la sidebar et les liens internes. */
export type NavItem = {
  href: string;
  labelKey: "dashboard" | "regulations" | "impactAnalysis" | "evidence" | "copilot";
  icon: LucideIcon;
};

export const analysisNavItems: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/regulations", labelKey: "regulations", icon: ScrollText },
  { href: "/impact-analysis", labelKey: "impactAnalysis", icon: Table2 },
  { href: "/evidence", labelKey: "evidence", icon: FileSearch },
];

export const assistanceNavItems: readonly NavItem[] = [
  { href: "/copilot", labelKey: "copilot", icon: MessagesSquare },
];
