"use client";

import { cn } from "cn";
import {
  Check,
  Clock,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { HumanStatus } from "@/types/api";

const humanStatusIcons: Record<HumanStatus, LucideIcon> = {
  PENDING: Clock,
  ACCEPTED: Check,
  REJECTED: X,
  ESCALATED: TriangleAlert,
};

/**
 * Styles volontairement neutres : les 5 teintes de statut d'évaluation sont
 * réservées à `assessment` et ne doivent pas être reprises ici.
 */
const humanStatusClass: Record<HumanStatus, string> = {
  PENDING: "border-dashed text-muted-foreground",
  ACCEPTED: "border-foreground/25 bg-foreground/5 text-foreground",
  REJECTED: "border-foreground/25 bg-foreground/5 text-muted-foreground line-through",
  ESCALATED: "border-foreground/40 bg-foreground/10 text-foreground font-medium",
};

export function HumanStatusBadge({
  status,
  className,
}: {
  status: HumanStatus;
  className?: string;
}) {
  const t = useTranslations("humanStatus");
  const Icon = humanStatusIcons[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 whitespace-nowrap", humanStatusClass[status], className)}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {t(status)}
    </Badge>
  );
}
