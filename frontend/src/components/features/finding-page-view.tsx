"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle, Check, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AssessmentBadge } from "@/components/features/assessment-badge";
import { AssigneeSelect } from "@/components/features/assignee-select";
import { HighlightedText } from "@/components/features/document-viewer-with-highlights";
import { PriorityBadge } from "@/components/features/priority-badge";
import { HumanStatusBadge } from "@/components/features/human-status-badge";
import { RegulationDocumentDialog } from "@/components/features/regulation-document-dialog";
import { ErrorState, EmptyState, LoadingState } from "@/components/features/query-state";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { accessProfileForUser, canValidateFindings } from "@/lib/access-profile";
import { fetchFindingDetail } from "@/lib/api/findings";
import { fetchProcedure } from "@/lib/api/procedures";
import { queryKeys } from "@/lib/api/query-keys";
import { useValidateFinding } from "@/lib/api/use-validate-finding";
import { isBackendLive } from "@/lib/api/backend/config";

/**
 * Full-page review interface for a single finding (requirement × procedure mapping).
 * Lazy-loaded from a new tab via finding-id link clicks.
 * Backend-only; shows demo-mode unavailable message when not connected.
 */
export function FindingPageView({ findingId }: { findingId: string }) {
  const t = useTranslations("findingPage");
  const common = useTranslations("common");
  const actionsT = useTranslations("actions");
  const dialogT = useTranslations("procedureDialog");
  const searchParams = useSearchParams();
  const { user } = useSession();

  const regulationId = searchParams.get("regulationId") ?? "";
  const requirementId = searchParams.get("requirementId") ?? "";
  const canValidate = canValidateFindings(accessProfileForUser(user));

  const [customAction, setCustomAction] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>();
  const [isRegulationDialogOpen, setIsRegulationDialogOpen] = useState(false);
  const procedureContentRef = useRef<HTMLDivElement>(null);

  const { decide, isPending } = useValidateFinding(regulationId);

  // Note: this component branches on isBackendLive directly, unlike other resource layers,
  // because there is no MSW fallback for this feature (backend-only).
  const { data: mappingDetail, isPending: isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.findingDetail(findingId),
    queryFn: () => fetchFindingDetail(findingId),
    enabled: isBackendLive,
  });

  const procedureId = mappingDetail?.procedure.documentId;
  const { data: procedure } = useQuery({
    queryKey: queryKeys.procedure(procedureId ?? ""),
    queryFn: () => fetchProcedure(procedureId ?? ""),
    enabled: !!procedureId,
  });

  // Scroll to first highlight in procedure content when it loads
  useEffect(() => {
    if (procedureContentRef.current && (mappingDetail?.suggestedModifications?.length ?? 0) > 0) {
      // Use a small delay to ensure the DOM is fully rendered with highlights
      const timer = setTimeout(() => {
        const firstMark = procedureContentRef.current?.querySelector("mark");
        if (firstMark) {
          firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mappingDetail?.suggestedModifications, procedure]);

  // Demo mode check: show unavailable message when backend is not live
  if (!isBackendLive) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <EmptyState message={t("demoModeUnavailable")} />
      </div>
    );
  }

  if (isLoading) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!mappingDetail) return <EmptyState message={common("notAvailable")} />;

  const { finding, requirementSummary, regulationDocument, suggestedModifications } =
    mappingDetail;

  // Une décision acceptée ou rejetée est close : plus de bloc « Décision ».
  const isDecided = finding.human_status === "ACCEPTED" || finding.human_status === "REJECTED";

  // Synthetic evidence from suggested modifications for highlighting. Once accepted, the
  // procedure shown is the new version: highlight the text that was put in, not the old one.
  const syntheticEvidence = suggestedModifications.map((mod) => ({
    document_id: procedureId ?? "",
    document_title: mappingDetail.procedure.name ?? mappingDetail.procedure.procedureId,
    section_reference: mod.chunkNo ? `chunk ${mod.chunkNo}` : "suggested modification",
    excerpt: finding.human_status === "ACCEPTED" ? mod.newText : mod.originalText,
    language: requirementSummary.language as "FR" | "EN",
  }));

  function handleDecide(status: "ACCEPTED" | "REJECTED" | "ESCALATED") {
    if (status === "ESCALATED" && !assigneeId) {
      toast.error(actionsT("escalateNeedsAssignee"));
      return;
    }
    decide(finding.finding_id, status, {
      custom_action: customAction.trim() || undefined,
      assignee_id: status === "ESCALATED" ? assigneeId : undefined,
      actor_id: user?.user_id ?? "",
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div className="print:hidden">
        {regulationId && requirementId ? (
          <BreadcrumbTrail
            items={[
              {
                label: dialogT("backToFinding", { requirement: requirementId }),
                href: `/regulations/${regulationId}?tab=requirements&focus=${requirementId}`,
              },
              { label: t("findingDetail") },
            ]}
          />
        ) : null}
      </div>

      {/* Header with badges */}
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-medium">{finding.finding_id}</span>
          {finding.requirement_id && (
            <Badge variant="secondary" className="font-mono text-[11px]">
              {finding.requirement_id}
            </Badge>
          )}
          {finding.procedure_id && (
            <Badge variant="outline" className="font-mono text-[11px]">
              {finding.procedure_id}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AssessmentBadge assessment={finding.assessment} />
          <HumanStatusBadge status={finding.human_status} />
          <PriorityBadge priority={finding.priority} />
        </div>
      </div>

      {/* Overview card - Regulation source and extracted requirement */}
      <div className="space-y-3">
        {/* Regulation document section - source */}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-sm text-amber-900 dark:text-amber-100">
              {t("regulationDocument")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">{regulationDocument.title}</p>
              <p className="text-xs text-muted-foreground">
                {regulationDocument.authority_or_owner}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {regulationDocument.domain && regulationDocument.domain.length > 0 && (
                <Badge variant="secondary" className="text-[11px]">
                  {regulationDocument.domain.join(", ")}
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px]">
                {regulationDocument.version}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRegulationDialogOpen(true)}
            >
              {t("viewDocument")}
            </Button>
          </CardContent>
        </Card>

        {/* Arrow/indicator showing extraction */}
        <div className="flex justify-center py-1">
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded">
            ↓ Extracted requirement
          </div>
        </div>

        {/* Requirement section - extracted from regulation */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
              {t("requirement")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-base font-semibold leading-snug">{requirementSummary.title}</p>
              {finding.regulatory_evidence.length > 0 && (
                <p className="text-sm leading-relaxed text-foreground bg-white dark:bg-slate-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                  {finding.regulatory_evidence[0].excerpt}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {requirementSummary.domain.length > 0 && (
                <Badge variant="secondary" className="text-[11px]">
                  {requirementSummary.domain.join(", ")}
                </Badge>
              )}
              <PriorityBadge priority={requirementSummary.riskLevel} />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Impacted procedure */}
      {procedure && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("impactedProcedure")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="font-medium">{procedure.title}</p>
              <p className="text-xs text-muted-foreground">{procedure.document_id}</p>
            </div>
            <div
              ref={procedureContentRef}
              className="rounded-lg border bg-muted p-3 max-h-96 overflow-y-auto text-sm leading-relaxed"
            >
              <HighlightedText
                content={procedure.extracted_text}
                evidence={syntheticEvidence}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested modifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("suggestedModifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedModifications.length > 0 ? (
            <div className="space-y-4">
              {suggestedModifications.map((mod, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  {/* Original and Proposed side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        {t("original")}
                      </h5>
                      <p className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded text-foreground whitespace-pre-wrap border border-red-200 dark:border-red-800">
                        {mod.originalText}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        {t("proposed")}
                      </h5>
                      <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded text-foreground whitespace-pre-wrap border border-green-200 dark:border-green-800">
                        {mod.newText}
                      </p>
                    </div>
                  </div>

                  {/* Explanation and reasoning below */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
                    {finding.explanation && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold uppercase tracking-wide text-blue-900 dark:text-blue-100">
                          Explanation
                        </h5>
                        <p className="text-sm leading-relaxed text-foreground font-medium">{finding.explanation}</p>
                      </div>
                    )}

                    {finding.recommended_action && (
                      <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                        <h5 className="text-xs font-bold uppercase tracking-wide text-blue-900 dark:text-blue-100">
                          {t("recommendedAction")}
                        </h5>
                        <p className="text-sm leading-relaxed text-foreground font-medium">
                          {finding.recommended_action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("noSuggestedModifications")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Decision section */}
      {!isDecided && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("decision")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canValidate ? (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                    {actionsT("customAction")}
                  </label>
                  <Textarea
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    placeholder={actionsT("customActionPlaceholder")}
                    rows={3}
                    className="text-sm"
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={finding.human_status === "ACCEPTED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("ACCEPTED")}
                  >
                    <Check aria-hidden />
                    {actionsT("accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant={finding.human_status === "REJECTED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("REJECTED")}
                  >
                    <X aria-hidden />
                    {actionsT("reject")}
                  </Button>
                  <Button
                    size="sm"
                    variant={finding.human_status === "ESCALATED" ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleDecide("ESCALATED")}
                  >
                    <ArrowUpCircle aria-hidden />
                    {actionsT("escalate")}
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
              <p className="text-xs text-muted-foreground">{actionsT("readOnlyNotice")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regulation document modal */}
      {regulationDocument && (
        <RegulationDocumentDialog
          document={regulationDocument}
          evidence={
            finding.regulatory_evidence.length > 0
              ? [finding.regulatory_evidence[0]]
              : []
          }
          isOpen={isRegulationDialogOpen}
          onOpenChange={setIsRegulationDialogOpen}
        />
      )}
    </div>
  );
}
