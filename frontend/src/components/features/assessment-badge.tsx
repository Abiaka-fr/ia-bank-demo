"use client";

import { cn } from "cn";
import {
  AlertTriangle,
  CircleAlert,
  CircleHelp,
  Check,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { assessmentBadgeClass } from "@/lib/assessment";
import type { Assessment } from "@/types/api";

/**
 * Un statut n'est jamais porté par la couleur seule : icône + libellé systématiques
 * (`docs/ui-guidelines.md`, principe d'accessibilité 5).
 */
const assessmentIcons: Record<Assessment, LucideIcon> = {
  COVERED: Check,
  PARTIAL: AlertTriangle,
  POTENTIAL_GAP: CircleAlert,
  NO_RELEVANT_PROCEDURE: CircleHelp,
  EXPERT_REVIEW: UserSearch,
};

export function AssessmentBadge({
  assessment,
  className,
}: {
  assessment: Assessment;
  className?: string;
}) {
  const t = useTranslations("assessment");
  const help = useTranslations("assessmentHelp");
  const Icon = assessmentIcons[assessment];

  return (
    <Badge
      variant="outline"
      title={help(assessment)}
      className={cn(
        "gap-1.5 whitespace-nowrap font-medium",
        assessmentBadgeClass[assessment],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {t(assessment)}
    </Badge>
  );
}
