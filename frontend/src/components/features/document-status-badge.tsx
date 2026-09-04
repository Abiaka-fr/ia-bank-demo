"use client";

import { cn } from "cn";
import { CircleDashed, CircleDot, CircleCheck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/types/api";

const icons: Record<DocumentStatus, LucideIcon> = {
  NOT_ANALYZED: CircleDashed,
  ANALYZING: CircleDot,
  ANALYZED: CircleCheck,
};

/** Styles neutres : le statut d'un document n'emprunte pas la palette d'`assessment`. */
export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const t = useTranslations("documentStatus");
  const Icon = icons[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 whitespace-nowrap",
        status === "NOT_ANALYZED" && "border-dashed text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {t(status)}
    </Badge>
  );
}
