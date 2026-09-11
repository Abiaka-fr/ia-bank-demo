"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { AssigneeName } from "@/components/features/assignee-select";
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
import { queryKeys } from "@/lib/api/query-keys";
import { fetchProcedures } from "@/lib/api/procedures";

type SortOrder = "newest" | "oldest" | "title";

/**
 * Liste des procédures internes — Phase 6 § 2.2 / Phase 7 Jour 0, même pattern que
 * `RegulationsView` (recherche + tri, cartes cliquables), volontairement plus simple
 * (pas d'assignation modifiable en ligne : pas demandé pour cet écran).
 */
export function ProceduresView() {
  const t = useTranslations("procedures");
  const common = useTranslations("common");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  const proceduresQuery = useQuery({
    queryKey: queryKeys.procedures(),
    queryFn: fetchProcedures,
  });

  const visibleProcedures = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (proceduresQuery.data ?? []).filter(
      (procedure) =>
        query === "" ||
        procedure.title.toLowerCase().includes(query) ||
        procedure.document_id.toLowerCase().includes(query),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const dateA = a.uploaded_at ?? "";
      const dateB = b.uploaded_at ?? "";
      return sort === "newest" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
  }, [proceduresQuery.data, search, sort]);

  if (proceduresQuery.isPending) return <LoadingState rows={3} />;
  if (proceduresQuery.isError) {
    return (
      <ErrorState
        error={proceduresQuery.error}
        onRetry={() => void proceduresQuery.refetch()}
      />
    );
  }
  if (!proceduresQuery.data.length) return <EmptyState message={t("empty")} />;

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
      </div>

      {visibleProcedures.length === 0 ? (
        <EmptyState message={t("filterNoResults")} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProcedures.map((procedure) => (
          <Card
            key={procedure.document_id}
            className="relative flex flex-col transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30"
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {procedure.document_id}
                </Badge>
                <ChevronRight
                  className="ml-auto size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base leading-snug">
                <Link
                  href={`/procedures/${procedure.document_id}`}
                  className="after:absolute after:inset-0 after:rounded-xl hover:underline focus:outline-none"
                >
                  {procedure.title}
                </Link>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("owner")}</dt>
                  <dd>{procedure.authority_or_owner}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {common("effectiveDate")}
                  </dt>
                  <dd>{procedure.effective_date ?? common("notAvailable")}</dd>
                </div>
                {procedure.uploaded_by_id ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t("uploadedBy")}
                    </dt>
                    <dd>
                      <AssigneeName userId={procedure.uploaded_by_id} />
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("uploadedAtLabel")}
                  </dt>
                  <dd>{procedure.uploaded_at?.slice(0, 10) ?? common("notAvailable")}</dd>
                </div>
              </dl>

              {procedure.domain.length ? (
                <div className="flex flex-wrap gap-1">
                  {procedure.domain.map((domain) => (
                    <Badge key={domain} variant="outline" className="text-[11px]">
                      {domain}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <p className="mt-auto pt-1 text-xs text-muted-foreground">
                {t("openCardHint")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
