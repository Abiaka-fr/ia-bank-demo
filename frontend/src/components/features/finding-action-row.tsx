"use client";

import { cn } from "cn";
import { ArrowUpCircle, Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { AssigneeSelect } from "@/components/features/assignee-select";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { PriorityBadge } from "@/components/features/priority-badge";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { accessProfileForUser, canValidateFindings } from "@/lib/access-profile";
import { pickLocalizedText } from "@/lib/localized-text";
import { useValidateFinding } from "@/lib/api/use-validate-finding";
import { openInNewTabWithSession } from "@/lib/open-in-new-tab";
import type { Finding, Requirement } from "@/types/api";

/**
 * Une ligne = un couple (exigence × procédure) — contrat v1.1.
 *
 * « Action retenue » vide signifie que l'action recommandée s'applique telle quelle.
 * Cliquer sur la ligne ouvre `FindingDetailDialog` (preuves, explication, éléments
 * manquants) — jamais un constat affiché sans sa traçabilité (`docs/ui-guardrails.md`),
 * seulement dans une fenêtre dédiée plutôt qu'un panneau poussant les lignes suivantes
 * (retour Giang, 2026-09-09 : plusieurs panneaux ouverts à la fois rendaient le
 * tableau difficile à suivre).
 */
export function FindingActionRow({
  finding,
  requirement,
  regulationId,
  isFocused = false,
  isFirstFocused = false,
}: {
  finding: Finding;
  requirement: Requirement | undefined;
  regulationId: string;
  /** Mise en avant après navigation depuis la carte mentale ou les exigences. */
  isFocused?: boolean;
  isFirstFocused?: boolean;
}) {
  const t = useTranslations("actions");
  const { user } = useSession();
  const locale = useLocale();
  const canValidate = canValidateFindings(accessProfileForUser(user));

  const rowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (isFirstFocused) {
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isFirstFocused]);

  const [customAction, setCustomAction] = useState(finding.custom_action ?? "");
  const [assigneeId, setAssigneeId] = useState(finding.assignee_id);

  const { decide, isPending } = useValidateFinding(regulationId);

  // Build the new-tab href for this finding — can only open if procedure exists
  const canOpenFinding = finding.procedure_id !== null && finding.procedure_id !== undefined;
  const newTabHref = canOpenFinding
    ? `/${locale}/findings/${finding.finding_id}?regulationId=${regulationId}&requirementId=${finding.requirement_id}`
    : undefined;

  function handleOpenFinding() {
    if (newTabHref) {
      openInNewTabWithSession(newTabHref);
    }
  }

  function handleDecide(humanStatus: "ACCEPTED" | "REJECTED" | "ESCALATED") {
    decide(finding.finding_id, humanStatus, {
      custom_action: customAction.trim() || undefined,
      assignee_id: humanStatus === "ESCALATED" ? assigneeId : undefined,
      actor_id: user?.user_id ?? "",
    });
  }
  const recommendedAction = pickLocalizedText(
    locale,
    finding.recommended_action,
    finding.recommended_action_fr,
  );

  return (
    <>
      <TableRow
        ref={rowRef}
        className={cn(
          "align-top scroll-mt-24",
          // Teinte neutre : les couleurs de statut restent réservées à `assessment`.
          isFocused && "bg-foreground/8 ring-1 ring-inset ring-foreground/25",
        )}
      >
        <TableCell
          className={cn("whitespace-normal py-3", canOpenFinding && "cursor-pointer")}
          onClick={handleOpenFinding}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenFinding();
              }}
              disabled={!canOpenFinding}
              className={cn(
                "inline-flex items-center gap-1 rounded font-mono text-xs font-medium",
                canOpenFinding && "hover:underline cursor-pointer",
                !canOpenFinding && "text-muted-foreground cursor-default",
              )}
            >
              {finding.requirement_id}
            </button>
            {requirement ? (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {requirement.source_reference}
              </Badge>
            ) : null}
            <PriorityBadge priority={finding.priority} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {requirement
              ? pickLocalizedText(
                  locale,
                  requirement.normalized_requirement,
                  requirement.normalized_requirement_fr,
                )
              : null}
          </p>
        </TableCell>

        <TableCell
          className={cn("whitespace-normal", canOpenFinding && "cursor-pointer")}
          onClick={handleOpenFinding}
        >
          {finding.procedure_id ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              {finding.procedure_id}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          <div className="mt-1.5">
            <AssessmentBadge assessment={finding.assessment} />
          </div>
        </TableCell>

        <TableCell className="whitespace-normal">
          <p className="max-w-xs text-sm">{recommendedAction}</p>
        </TableCell>

        <TableCell className="whitespace-normal">
          <Textarea
            aria-label={t("customAction")}
            value={customAction}
            onChange={(event) => setCustomAction(event.target.value)}
            placeholder={t("customActionPlaceholder")}
            rows={3}
            className="min-w-56 text-sm"
            disabled={!canValidate}
          />
        </TableCell>

        <TableCell className="whitespace-normal">
          <div className="flex flex-col gap-2">
            <HumanStatusBadge status={finding.human_status} />
            {canValidate ? (
              <>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={finding.human_status === "ACCEPTED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("ACCEPTED")}
                  >
                    <Check aria-hidden />
                    {t("accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant={finding.human_status === "REJECTED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("REJECTED")}
                  >
                    <X aria-hidden />
                    {t("reject")}
                  </Button>
                  <Button
                    size="sm"
                    variant={finding.human_status === "ESCALATED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("ESCALATED")}
                  >
                    <ArrowUpCircle aria-hidden />
                    {t("escalate")}
                  </Button>
                </div>
                <AssigneeSelect
                  value={assigneeId}
                  onChange={setAssigneeId}
                  disabled={isPending}
                  className="w-full"
                />
              </>
            ) : (
              // Profil AUDITOR : consultation seule (phase-6-francis-feedback.md § 1),
              // pas un vrai contrôle d'accès — voir docs/known-limitations.md.
              <p className="text-xs text-muted-foreground">{t("readOnlyNotice")}</p>
            )}
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
