"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Search, UserRoundCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AssigneeName, AssigneeSelect } from "@/components/features/assignee-select";
import { AwaitingBackendBadge } from "@/components/features/awaiting-backend-badge";
import { DocumentStatusBadge } from "@/components/features/document-status-badge";
import { ReviewProgressBar } from "@/components/features/review-progress";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { fetchPortfolioSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";
import {
  fetchRegulations,
  updateRegulationAssignee,
} from "@/lib/api/regulations";
import type { RegulationSummary } from "@/types/api";

const ALL_AUTHORITIES = "ALL";
type SortOrder = "newest" | "oldest" | "title";

export function RegulationsView() {
  const t = useTranslations("regulations");
  const common = useTranslations("common");
  const assigneeT = useTranslations("assignee");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [authority, setAuthority] = useState<string>(ALL_AUTHORITIES);
  const [sort, setSort] = useState<SortOrder>("newest");

  const regulationsQuery = useQuery({
    queryKey: queryKeys.regulations(),
    queryFn: fetchRegulations,
  });

  // Les compteurs des cartes viennent du même agrégat que le dashboard : une seule
  // requête plutôt qu'un `summary` par carte.
  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: fetchPortfolioSummary,
  });

  const assignMutation = useMutation({
    mutationFn: (input: { regulationId: string; assigneeId: string }) =>
      updateRegulationAssignee(input.regulationId, input.assigneeId),
    onSuccess: async () => {
      toast.success(assigneeT("updated"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.regulations() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary() });
    },
    onError: () => toast.error(assigneeT("updateFailed")),
  });

  const authorities = useMemo(
    () =>
      Array.from(
        new Set((regulationsQuery.data ?? []).map((reg) => reg.authority_or_owner)),
      ).sort((a, b) => a.localeCompare(b)),
    [regulationsQuery.data],
  );

  const visibleRegulations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (regulationsQuery.data ?? []).filter((reg) => {
      const matchesSearch =
        query === "" ||
        reg.title.toLowerCase().includes(query) ||
        reg.document_id.toLowerCase().includes(query);
      const matchesAuthority =
        authority === ALL_AUTHORITIES || reg.authority_or_owner === authority;
      return matchesSearch && matchesAuthority;
    });
    // Comparaison inversée pour "newest" : la date la plus récente en premier.
    // `uploaded_at` absent (aucun cas dans le corpus actuel) est traité comme le plus
    // ancien, pas comme le plus récent — pour ne pas faire remonter une donnée
    // manquante en tête de liste.
    return [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const dateA = a.uploaded_at ?? "";
      const dateB = b.uploaded_at ?? "";
      return sort === "newest" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
  }, [regulationsQuery.data, search, authority, sort]);

  if (regulationsQuery.isPending) return <LoadingState rows={3} />;
  if (regulationsQuery.isError) {
    return (
      <ErrorState
        error={regulationsQuery.error}
        onRetry={() => void regulationsQuery.refetch()}
      />
    );
  }
  if (!regulationsQuery.data.length) return <EmptyState message={t("empty")} />;

  const summaryByRegulation = new Map<string, RegulationSummary>(
    (summaryQuery.data?.by_regulation ?? []).map((row) => [row.regulation_id, row]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchByTitlePlaceholder")}
            aria-label={t("searchByTitlePlaceholder")}
            className="pl-8"
          />
        </div>

        <Select value={authority} onValueChange={setAuthority}>
          <SelectTrigger size="sm" aria-label={t("filterAuthority")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AUTHORITIES}>
              {t("filterAuthority")}: {t("filterAllAuthorities")}
            </SelectItem>
            {authorities.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortOrder)}>
          <SelectTrigger size="sm" aria-label={t("sortLabel")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortLabel")}: {t("sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
            <SelectItem value="title">{t("sortTitle")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtre par classification métier demandé par Francis (« concerning
            customer », « concerning head office »…) — aucune taxonomie de ce type
            n'existe dans le corpus (backend ni mock), inventer les catégories aurait
            été de la donnée fabriquée. L'emplacement reste visible, désactivé, avec
            le badge « en attente » plutôt que disparaître silencieusement (décision
            Giang, 2026-09-11, docs/ui-guidelines.md § « donnée en attente »). */}
        <div className="flex items-center gap-1.5">
          <Select disabled>
            <SelectTrigger size="sm" aria-label={t("filterClassification")} className="w-48">
              <SelectValue placeholder={`${t("filterClassification")}: ${t("filterClassificationPlaceholder")}`} />
            </SelectTrigger>
            <SelectContent />
          </Select>
          <AwaitingBackendBadge field="DocumentMeta.classification" />
        </div>
      </div>

      {visibleRegulations.length === 0 ? (
        <EmptyState message={t("filterNoResults")} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleRegulations.map((regulation) => {
        const summary = summaryByRegulation.get(regulation.document_id);
        const escalatedAssigneeIds = summary?.escalated_assignee_ids ?? [];
        const hasReview = (summary?.actions_total ?? 0) > 0;

        return (
          <Card
            key={regulation.document_id}
            className="relative flex flex-col transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30"
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {regulation.document_id}
                </Badge>
                {!hasReview ? (
                  <DocumentStatusBadge status={regulation.status} />
                ) : null}
                <ChevronRight
                  className="ml-auto size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base leading-snug">
                <Link
                  href={`/regulations/${regulation.document_id}`}
                  className="after:absolute after:inset-0 after:rounded-xl hover:underline focus:outline-none"
                >
                  {regulation.title}
                </Link>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {/* Résumé court demandé par Francis (« I don't know what is about this
                  document ») — aucun champ résumé n'existe dans le corpus, badge
                  « en attente » plutôt qu'un texte inventé ou un silence total. */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t("summaryLabel")} :</span>
                <AwaitingBackendBadge field="DocumentMeta.summary" />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("authority")}</dt>
                  <dd>{regulation.authority_or_owner}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {common("effectiveDate")}
                  </dt>
                  <dd>{regulation.effective_date ?? common("notAvailable")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("uploadedBy")}
                  </dt>
                  <dd>
                    <AssigneeName userId={regulation.uploaded_by_id} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("uploadedAtLabel")}
                  </dt>
                  <dd>{regulation.uploaded_at?.slice(0, 10) ?? common("notAvailable")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("createdDateLabel")}
                  </dt>
                  {/* `publication_date` existe déjà au contrat et dans le corpus mock —
                      réel dès que disponible, badge seulement s'il manque vraiment
                      (mode backend réel aujourd'hui). Jamais réutiliser `uploaded_at`
                      sous ce libellé : ce sont deux dates distinctes pour Francis. */}
                  <dd>
                    {regulation.publication_date ?? (
                      <AwaitingBackendBadge field="DocumentMeta.publication_date" />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("lastUpdatedLabel")}
                  </dt>
                  <dd>
                    <AwaitingBackendBadge field="DocumentMeta.updated_at" />
                  </dd>
                </div>
              </dl>

              {hasReview && summary ? (
                <ReviewProgressBar counts={summary.by_human_status} />
              ) : null}

              {regulation.domain.length ? (
                <div className="flex flex-wrap gap-1">
                  {regulation.domain.map((domain) => (
                    <Badge key={domain} variant="outline" className="text-[11px]">
                      {domain}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="relative z-10 space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRoundCheck className="size-3.5" aria-hidden />
                  {assigneeT("label")}
                </p>
                {/* Modifiable directement sur la carte : l'assignation faite à
                    l'upload n'est pas définitive. */}
                <AssigneeSelect
                  value={regulation.assignee_id}
                  disabled={assignMutation.isPending}
                  onChange={(assigneeId) =>
                    assignMutation.mutate({
                      regulationId: regulation.document_id,
                      assigneeId,
                    })
                  }
                  className="w-full"
                />
              </div>

              {escalatedAssigneeIds.length ? (
                <div className="space-y-1 rounded-md border border-dashed p-2">
                  <p className="text-xs text-muted-foreground">
                    {assigneeT("escalatedTo")}
                  </p>
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {escalatedAssigneeIds.map((userId) => (
                      <li key={userId}>
                        <Badge variant="outline" className="text-[11px]">
                          <AssigneeName userId={userId} />
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-auto pt-1 text-xs text-muted-foreground">
                {t("openCardHint")}
              </p>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
