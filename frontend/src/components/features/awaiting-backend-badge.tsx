"use client";

import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Signale un emplacement qui attend un champ/endpoint pas encore exposé par le
 * backend — convention posée par Giang le 2026-09-11 (`docs/ui-guidelines.md` §
 * « donnée en attente côté backend »). Construire l'écran maintenant avec ce badge
 * plutôt que de laisser la fonctionnalité invisible en attendant Thư, et **jamais**
 * en inventant la donnée (`docs/ui-guardrails.md`).
 *
 * Teinte neutre volontaire (jamais une des 5 couleurs de statut ni la palette
 * catégorielle) + bordure en tirets pour le distinguer d'un badge de statut normal.
 */
export function AwaitingBackendBadge({ field }: { field: string }) {
  const t = useTranslations("awaitingBackend");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 border-dashed text-muted-foreground"
          >
            <Wrench className="size-3" aria-hidden />
            {t("badge")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{t("tooltip", { field })}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
