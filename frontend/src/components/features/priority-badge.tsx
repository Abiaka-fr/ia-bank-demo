"use client";

import { cn } from "cn";
import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { priorityBadgeClass } from "@/lib/assessment";
import type { Priority } from "@/types/api";

const priorityIcons: Record<Priority, LucideIcon> = {
  HIGH: ArrowUp,
  MEDIUM: ArrowRight,
  LOW: ArrowDown,
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const t = useTranslations("priority");
  const Icon = priorityIcons[priority];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 whitespace-nowrap",
        priorityBadgeClass[priority],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {t(priority)}
    </Badge>
  );
}
