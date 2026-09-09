"use client";

import { useLocale, useTranslations } from "next-intl";

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
}: {
  finding: Finding;
  requirement: Requirement | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
          <DialogDescription>{requirement?.normalized_requirement}</DialogDescription>
        </DialogHeader>

        {/* `overflow-y-auto` natif plutôt que `ScrollArea` (Radix) : dans ce dialogue,
            le viewport interne de `ScrollArea` ne se limitait jamais à la hauteur
            donnée par flexbox (`height:100%` refusait de se résoudre ici, cause non
            identifiée avec certitude malgré plusieurs essais) et le contenu débordait
            sans défiler. Un `div` avec défilement natif n'a pas ce problème : sa propre
            hauteur, résolue par flexbox, suffit à faire défiler son contenu — pas
            besoin d'un enfant en pourcentage. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {evidenceT("regulatorySide")}
              </h3>
              {finding.regulatory_evidence.map((evidence) => (
                <EvidenceCard
                  key={`${evidence.document_id}-${evidence.section_reference}`}
                  evidence={evidence}
                />
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {evidenceT("internalSide")}
              </h3>
              {finding.internal_evidence.length ? (
                finding.internal_evidence.map((evidence) => (
                  <EvidenceCard
                    key={`${evidence.document_id}-${evidence.section_reference}`}
                    evidence={evidence}
                    openable
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {evidenceT("noInternalEvidence")}
                </p>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {evidenceT("explanation")}
              </h3>
              <p className="text-sm leading-relaxed">{explanation}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {evidenceT("evidenceStrength")}
                <EvidenceStrength value={finding.confidence_or_evidence_strength} />
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("columnRecommended")}
              </h3>
              <p className="text-sm leading-relaxed">{recommendedAction}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {evidenceT("missingElements")}
            </h3>
            {finding.missing_or_ambiguous_elements.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {finding.missing_or_ambiguous_elements.map((element) => (
                  <li key={element}>{element}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {evidenceT("noMissingElements")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
