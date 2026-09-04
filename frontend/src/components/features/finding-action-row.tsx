"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Check, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { AssigneeSelect } from "@/components/features/assignee-select";
import { EvidenceCard } from "@/components/features/evidence-card";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { PriorityBadge } from "@/components/features/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { validateFinding } from "@/lib/api/findings";
import { queryKeys } from "@/lib/api/query-keys";
import type { Finding, HumanStatus, Requirement } from "@/types/api";

/**
 * Une ligne = un couple (exigence × procédure) — contrat v1.1.
 *
 * « Action retenue » vide signifie que l'action recommandée s'applique telle quelle ;
 * si elle est remplie, c'est elle qui fait foi. La ligne se déplie pour montrer les
 * preuves source, jamais de constat affiché sans sa traçabilité
 * (`docs/ui-guardrails.md`).
 */
export function FindingActionRow({
  finding,
  requirement,
  regulationId,
}: {
  finding: Finding;
  requirement: Requirement | undefined;
  regulationId: string;
}) {
  const t = useTranslations("actions");
  const statusLabels = useTranslations("humanStatus");
  const evidenceT = useTranslations("evidence");
  const queryClient = useQueryClient();

  const [isExpanded, setIsExpanded] = useState(false);
  const [customAction, setCustomAction] = useState(finding.custom_action ?? "");
  const [assigneeId, setAssigneeId] = useState(finding.assignee_id);

  const mutation = useMutation({
    mutationFn: (humanStatus: HumanStatus) =>
      validateFinding(finding.finding_id, {
        human_status: humanStatus,
        custom_action: customAction.trim() || undefined,
        assignee_id: humanStatus === "ESCALATED" ? assigneeId : undefined,
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

  return (
    <>
      <TableRow className="align-top">
        <TableCell className="whitespace-normal py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-1 rounded font-mono text-xs font-medium hover:underline"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                aria-hidden
              />
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

        <TableCell className="whitespace-normal">
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
          <p className="max-w-xs text-sm">{finding.recommended_action}</p>
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

      {isExpanded ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={5} className="whitespace-normal p-4">
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
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {evidenceT("noInternalEvidence")}
                  </p>
                )}
              </section>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {evidenceT("explanation")}
                </h3>
                <p className="text-sm leading-relaxed">{finding.explanation}</p>
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
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
