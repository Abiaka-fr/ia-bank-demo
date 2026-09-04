"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateFinding } from "@/lib/api/findings";
import { queryKeys } from "@/lib/api/query-keys";
import type { Finding, HumanStatus } from "@/types/api";

/**
 * Validation humaine — le système propose, le Responsable Conformité tranche
 * (`docs/ui-guardrails.md`). Les trois actions sont atteignables au clavier.
 */
export function FindingValidation({ finding }: { finding: Finding }) {
  const t = useTranslations("evidence");
  const statusLabels = useTranslations("humanStatus");
  const queryClient = useQueryClient();
  const { selectedRegulationId } = useSelectedRegulation();
  const [comment, setComment] = useState(finding.reviewer_comment ?? "");

  const mutation = useMutation({
    mutationFn: (humanStatus: HumanStatus) =>
      validateFinding(finding.finding_id, {
        human_status: humanStatus,
        reviewer_comment: comment.trim() || undefined,
      }),
    onSuccess: async (updated) => {
      toast.success(t("saved"), {
        description: t("currentDecision", {
          status: statusLabels(updated.human_status),
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.findings(selectedRegulationId ?? undefined),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.requirementFindings(updated.requirement_id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardSummary(selectedRegulationId ?? undefined),
      });
    },
    onError: () => {
      toast.error(t("saveFailed"));
    },
  });

  const actions = [
    { status: "ACCEPTED", label: t("accept"), icon: Check },
    { status: "REJECTED", label: t("reject"), icon: X },
    { status: "ESCALATED", label: t("escalate"), icon: ArrowUpCircle },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-base">
          {t("validationHeading")}
          <HumanStatusBadge status={finding.human_status} />
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("validationHelp")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reviewer-comment">{t("commentLabel")}</Label>
          <Textarea
            id="reviewer-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              variant={
                finding.human_status === action.status ? "default" : "outline"
              }
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(action.status)}
            >
              <action.icon aria-hidden />
              {mutation.isPending && mutation.variables === action.status
                ? t("saving")
                : action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
