"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ArrowUpCircle, Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { AssigneeSelect } from "@/components/features/assignee-select";
import { FindingDetailDialog } from "@/components/features/finding-detail-dialog";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { PriorityBadge } from "@/components/features/priority-badge";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { validateFinding } from "@/lib/api/findings";
import { queryKeys } from "@/lib/api/query-keys";
import { pickLocalizedText } from "@/lib/localized-text";
import type { Finding, HumanStatus, Requirement } from "@/types/api";

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
  const statusLabels = useTranslations("humanStatus");
  const queryClient = useQueryClient();
  const { user } = useSession();
  const locale = useLocale();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const rowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (isFirstFocused) {
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isFirstFocused]);
  const [customAction, setCustomAction] = useState(finding.custom_action ?? "");
  const [assigneeId, setAssigneeId] = useState(finding.assignee_id);

  const mutation = useMutation({
    mutationFn: (humanStatus: HumanStatus) =>
      validateFinding(finding.finding_id, {
        human_status: humanStatus,
        custom_action: customAction.trim() || undefined,
        assignee_id: humanStatus === "ESCALATED" ? assigneeId : undefined,
        // Toujours renseigné : la garde de session interdit d'atteindre cet écran
        // sans utilisateur connecté.
        actor_id: user?.user_id ?? "",
      }),
    onSuccess: async (updated) => {
      toast.success(t("saved"), {
        description: statusLabels(updated.human_status),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.findings(regulationId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardSummary(regulationId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.portfolioSummary(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.regulationHistory(regulationId),
      });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  function decide(humanStatus: HumanStatus) {
    if (humanStatus === "ESCALATED" && !assigneeId) {
      toast.error(t("escalateNeedsAssignee"));
      return;
    }
    mutation.mutate(humanStatus);
  }

  const isPending = mutation.isPending;
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
          className="cursor-pointer whitespace-normal py-3"
          onClick={() => setIsDetailOpen(true)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              // Empêche le second déclenchement par le `onClick` de la cellule :
              // sans lui, cliquer précisément sur le bouton ouvrirait deux fois la
              // fenêtre (sans effet visible, mais deux appels pour rien).
              onClick={(event) => {
                event.stopPropagation();
                setIsDetailOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded font-mono text-xs font-medium hover:underline"
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
            {requirement?.normalized_requirement}
          </p>
        </TableCell>

        <TableCell
          className="cursor-pointer whitespace-normal"
          onClick={() => setIsDetailOpen(true)}
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

        <TableCell
          className="cursor-pointer whitespace-normal"
          onClick={() => setIsDetailOpen(true)}
        >
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
          />
        </TableCell>

        <TableCell className="whitespace-normal">
          <div className="flex flex-col gap-2">
            <HumanStatusBadge status={finding.human_status} />
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={finding.human_status === "ACCEPTED" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => decide("ACCEPTED")}
              >
                <Check aria-hidden />
                {t("accept")}
              </Button>
              <Button
                size="sm"
                variant={finding.human_status === "REJECTED" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => decide("REJECTED")}
              >
                <X aria-hidden />
                {t("reject")}
              </Button>
              <Button
                size="sm"
                variant={finding.human_status === "ESCALATED" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => decide("ESCALATED")}
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
          </div>
        </TableCell>
      </TableRow>

      <FindingDetailDialog
        finding={finding}
        requirement={requirement}
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
}
