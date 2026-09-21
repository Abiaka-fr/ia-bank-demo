"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
