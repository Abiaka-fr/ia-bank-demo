"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { notifyOtherTabs } from "@/lib/api/cross-tab";
import { validateFinding } from "@/lib/api/findings";
import { queryKeys } from "@/lib/api/query-keys";
import type { HumanStatus, ValidateFindingBody } from "@/types/api";

/**
 * Shared mutation hook for validating/deciding on findings across screens.
 * Handles the mutation, success/error toasts, and cache invalidation.
 */
export function useValidateFinding(regulationId: string) {
  const t = useTranslations("actions");
  const statusLabels = useTranslations("humanStatus");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      findingId,
      body,
    }: {
      findingId: string;
      body: ValidateFindingBody;
    }) => validateFinding(findingId, body),
    onSuccess: async (updated, { findingId }) => {
      toast.success(t("saved"), {
        description: statusLabels(updated.human_status),
      });
      notifyOtherTabs();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.findings(regulationId),
      });
      // Agrégats, portefeuille et carte mentale d'un coup (préfixe commun).
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.regulationHistory(regulationId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mappingHistory(findingId),
      });
      // Page de détail du constat, et procédure : une acceptation en crée une nouvelle version.
      await queryClient.invalidateQueries({ queryKey: queryKeys.findingDetail(findingId) });
      if (updated.procedure_id) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.procedure(updated.procedure_id),
        });
      }
    },
    onError: (error) => toast.error(t("saveFailed"), { description: error.message }),
  });

  function decide(
    findingId: string,
    humanStatus: HumanStatus,
    body: Omit<ValidateFindingBody, "human_status">,
  ) {
    mutation.mutate({
      findingId,
      body: { ...body, human_status: humanStatus },
    });
  }

  return {
    mutation,
    decide,
    isPending: mutation.isPending,
  };
}
