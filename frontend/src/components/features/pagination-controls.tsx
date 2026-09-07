"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Pagination minimale — précédent/suivant + « page X sur Y » — pour les listes du
 * tableau de bord (régulations non traitées à 100 %, carte des impacts). Pas de
 * numéros de page cliquables : ce volume de pages ne le justifie pas.
 */
export function PaginationControls({
  page,
  pageCount,
  onPageChange,
}: {
  /** 1-indexé, comme affiché à l'utilisateur. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("common");

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">
        {t("pageOf", { page, pageCount })}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden />
        <span className="sr-only">{t("previousPage")}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="sr-only">{t("nextPage")}</span>
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}
