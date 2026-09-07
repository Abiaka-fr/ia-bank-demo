"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";

import { humanStatusValues } from "@/lib/assessment";
import type { HumanStatus } from "@/types/api";

export type HumanStatusCount = { human_status: HumanStatus; count: number };

/**
 * Progression de la revue humaine.
 *
 * À ne pas confondre avec `DocumentMeta.status`, qui décrit l'avancement de
 * l'analyse automatique. Un document peut être `ANALYZED` sans qu'aucun constat
 * n'ait encore été tranché — c'est précisément la distinction que cette barre rend
 * visible.
 *
 * Styles neutres et différenciés par la trame : les 5 teintes de statut restent
 * réservées à `assessment` (`docs/ui-guidelines.md`).
 */
const segmentClass: Record<HumanStatus, string> = {
  ACCEPTED: "bg-foreground/80",
  REJECTED: "bg-foreground/45",
  ESCALATED: "bg-foreground/25",
  PENDING: "bg-foreground/10",
};

function toMap(counts: readonly HumanStatusCount[]) {
  return new Map(counts.map((entry) => [entry.human_status, entry.count]));
}

function reviewProgress(counts: readonly HumanStatusCount[]) {
  const byStatus = toMap(counts);
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const pending = byStatus.get("PENDING") ?? 0;
  const handled = total - pending;

  return {
    total,
    handled,
    /** 0 constat = 0 % : on n'annonce pas « terminé » là où il n'y a rien à traiter. */
    percent: total === 0 ? 0 : Math.round((handled / total) * 100),
    isComplete: total > 0 && pending === 0,
    byStatus,
  };
}

export function ReviewProgressBar({
  counts,
  className,
  showBreakdown = true,
}: {
  counts: readonly HumanStatusCount[];
  className?: string;
  showBreakdown?: boolean;
}) {
  const t = useTranslations("progress");
  const statusLabels = useTranslations("humanStatus");
  const { total, handled, percent, isComplete, byStatus } = reviewProgress(counts);

  if (total === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {t("nothingToReview")}
      </p>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn("font-medium", isComplete && "text-foreground")}>
          {isComplete ? t("complete") : t("handledOf", { handled, total })}
        </span>
        <span className="tabular-nums text-muted-foreground">{percent}%</span>
      </div>

      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("label")}
      >
        {humanStatusValues.map((status) => {
          const count = byStatus.get(status) ?? 0;
          if (count === 0) return null;
          return (
            <span
              key={status}
              className={segmentClass[status]}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${statusLabels(status)} : ${count}`}
            />
          );
        })}
      </div>

      {showBreakdown ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {humanStatusValues.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("size-2 rounded-sm", segmentClass[status])}
              />
              {statusLabels(status)} : {byStatus.get(status) ?? 0}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
