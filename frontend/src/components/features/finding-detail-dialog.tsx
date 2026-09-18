"use client";

import { useLocale, useTranslations } from "next-intl";

import { DocumentViewerWithHighlights } from "@/components/features/document-viewer-with-highlights";
import { EvidenceCard } from "@/components/features/evidence-card";
import { EvidenceStrength } from "@/components/features/evidence-strength";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pickLocalizedText } from "@/lib/localized-text";
import type { Finding, Requirement } from "@/types/api";

/**
 * Détail complet d'un constat (couple exigence × procédure) : preuves côte à côte,
 * explication, force de la preuve, éléments manquants, action recommandée en entier.
 *
 * Remplace l'ancien panneau qui s'ouvrait *dans* la ligne du tableau : à l'échelle
 * d'une régulation à 8 constats, plusieurs panneaux ouverts en même temps rendaient le
 * tableau très long et difficile à suivre (retour Giang, 2026-09-09). La fenêtre garde
 * le tableau compact — sa hauteur ne dépend plus du nombre de lignes ouvertes — et
 * réutilise le même gabarit que `ProcedureEvidenceDialog` pour rester cohérent.
 *
 * Les boutons de décision (Accepter/Rejeter/Escalader) restent dans la ligne du
 * tableau, pas ici : trancher plusieurs constats à la suite doit rester rapide, sans
 * ouvrir une fenêtre à chaque fois.
 */
export function FindingDetailDialog({
  finding,
  requirement,
  isOpen,
  onOpenChange,
  regulationId,
}: {
  finding: Finding;
  requirement: Requirement | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Optionnel : sert uniquement à construire le lien « Retour au constat » depuis la
   * page `/procedures/[id]` ouverte en nouvel onglet (Phase 6 § 10). Sans lui, la
   * preuve interne reste cliquable comme avant, simplement sans ce lien de retour.
   */
  regulationId?: string;
}) {
  const t = useTranslations("actions");
  const evidenceT = useTranslations("evidence");
  const locale = useLocale();

  const explanation = pickLocalizedText(locale, finding.explanation, finding.explanation_fr);
  const recommendedAction = pickLocalizedText(
    locale,
    finding.recommended_action,
    finding.recommended_action_fr,
  );
  const requirementSourceText = requirement
    ? pickLocalizedText(locale, requirement.source_text, requirement.source_text_fr)
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // Même gabarit que `ProcedureEvidenceDialog` (~60 % du viewport) pour rester
        // cohérent — voir ce fichier pour le détail des choix `overflow-hidden`.
        className="flex max-h-[90vh] w-[60vw] max-w-none flex-col overflow-hidden sm:max-w-none"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{finding.requirement_id}</span>
            {finding.procedure_id ? (
              <Badge variant="outline" className="font-mono text-[11px]">
                {finding.procedure_id}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {requirement
              ? pickLocalizedText(
                  locale,
                  requirement.normalized_requirement,
                  requirement.normalized_requirement_fr,
                )
              : null}
          </DialogDescription>
        </DialogHeader>

        {/* Requirement source text and constat details */}
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {evidenceT("requirement")}
              </h3>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap rounded-lg bg-muted p-3">
                {requirementSourceText || "—"}
              </p>
            </div>
        {/* `overflow-y-auto` natif plutôt que `ScrollArea` (Radix) : dans ce dialogue,
            le viewport interne de `ScrollArea` ne se limitait jamais à la hauteur
            donnée par flexbox (`height:100%` refusait de se résoudre ici, cause non
            identifiée avec certitude malgré plusieurs essais) et le contenu débordait
            sans défiler. Un `div` avec défilement natif n'a pas ce problème : sa propre
            hauteur, résolue par flexbox, suffit à faire défiler son contenu — pas
            besoin d'un enfant en pourcentage. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
          {/* Full document with highlighted evidence */}
          <section className="space-y-2 border-b pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {evidenceT("regulatorySide")} — Full Document
            </h3>
            {finding.regulatory_evidence.length > 0 && (
              <DocumentViewerWithHighlights
                documentId={finding.regulatory_evidence[0]?.document_id}
                evidence={finding.regulatory_evidence}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
