"use client";

import { Inbox, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiContractError, ApiError } from "@/lib/api/client";

/** Squelette de chargement générique — aucune table/liste ne doit rester "nue". */
export function LoadingState({ rows = 4 }: { rows?: number }) {
  const t = useTranslations("common");
  return (
    <div className="space-y-2" role="status" aria-label={t("loading")}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function errorMessageKey(error: unknown) {
  if (error instanceof ApiContractError) return "contract" as const;
  if (error instanceof ApiError && error.status === 404) return "notFound" as const;
  return "generic" as const;
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{t(errorMessageKey(error))}</span>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {common("retry")}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
