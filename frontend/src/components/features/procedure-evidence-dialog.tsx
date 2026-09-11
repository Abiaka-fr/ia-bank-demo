"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ProcedureBody } from "@/components/features/procedure-body";
import { ErrorState, LoadingState } from "@/components/features/query-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openInNewTabWithSession } from "@/lib/open-in-new-tab";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchProcedure } from "@/lib/api/procedures";
import type { EvidenceRef } from "@/types/api";

/**
 * Affiche la procédure interne complète et surligne le passage cité par la preuve,
 * en y faisant défiler la vue — pour lire la citation dans son contexte.
 */
export function ProcedureEvidenceDialog({
  evidence,
  isOpen,
  onOpenChange,
  regulationId,
  requirementId,
}: {
  evidence: EvidenceRef;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optionnels : construisent le lien « Retour au constat » sur `/procedures/[id]`. */
  regulationId?: string;
  requirementId?: string;
}) {
  const t = useTranslations("procedureDialog");
  const locale = useLocale();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.procedure(evidence.document_id),
    queryFn: () => fetchProcedure(evidence.document_id),
    // Inutile de charger le document tant que la fenêtre n'est pas ouverte.
    enabled: isOpen,
  });

  // Le passage cité vient du constat consulté, pas du document lui-même : porté par
  // l'URL pour que la page dédiée (`/procedures/[id]`, Phase 6 § 5 — « ouvrir dans un
  // nouvel onglet ») puisse surligner le même extrait sans dépendre de ce dialogue.
  // Lien natif avec le préfixe de langue explicite (pas `i18n/navigation`) : cette
  // page doit s'ouvrir dans un vrai nouvel onglet (`target="_blank"`), ce que le
  // composant `Link` interne n'a pas besoin de gérer ailleurs dans l'app.
  const newTabParams = new URLSearchParams({
    excerpt: evidence.excerpt,
    section: evidence.section_reference,
  });
  if (regulationId) newTabParams.set("regulationId", regulationId);
  if (requirementId) newTabParams.set("requirementId", requirementId);
  const newTabHref = `/${locale}/procedures/${evidence.document_id}?${newTabParams.toString()}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // ~60 % de l'écran dans les deux dimensions (demande explicite) : la fenêtre
        // précédente (max-w-3xl, hauteur figée à 26rem) était trop étroite pour lire
        // un document entier confortablement. Bornée par le viewport pour rester
        // utilisable sur un petit écran (`max-h-[90vh]` en repli). `overflow-hidden` :
        // sans lui, un document plus haut que 90 % de l'écran déborde visuellement
        // hors de la carte au lieu d'être contenu par le défilement interne du corps.
        className="flex max-h-[90vh] w-[60vw] max-w-none flex-col overflow-hidden sm:max-w-none"
      >
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">{evidence.document_id}</span>
              <span>{data?.title ?? evidence.document_title}</span>
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openInNewTabWithSession(newTabHref)}
            >
              <ExternalLink aria-hidden />
              {t("openInNewTab")}
            </Button>
          </div>
          <DialogDescription>
            {t("citedSection", { section: evidence.section_reference })}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <LoadingState rows={5} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <ProcedureBody text={data.extracted_text} excerpt={evidence.excerpt} language={data.language} />
        )}
      </DialogContent>
    </Dialog>
  );
}
