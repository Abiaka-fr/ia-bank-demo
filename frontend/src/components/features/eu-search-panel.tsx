"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchEuSearch } from "@/lib/api/eu-search";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateDDMMYYYY } from "@/lib/format-date";
import {
  euSearchParamsSchema,
  euSearchTypeSchema,
  euSubjectSchema,
  type EuSearchParams,
} from "@/types/api";

const ALL_SUBJECTS = "ALL";
const MAX_PAGE = 50;

/**
 * Recherche de textes européens (CELLAR) — consultation uniquement : aucun
 * rapprochement avec les procédures de la banque, aucune conclusion d'applicabilité
 * (docs/ui-guardrails.md). Spec : docs/superpowers/specs/2026-09-15-eu-search-design.md.
 */
export function EuSearchPanel() {
  const t = useTranslations("knowledgeBase.euSearch");
  const common = useTranslations("common");
  const lang = useLocale() === "en" ? "en" : "fr";

  // Filtres appliqués ; la langue n'y est pas stockée, elle suit toujours l'interface.
  const [filters, setFilters] = useState<EuSearchParams>(() => euSearchParamsSchema.parse({}));
  // Champs saisis, appliqués uniquement à la soumission (aucune requête par frappe).
  const [keyword, setKeyword] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [invalidYears, setInvalidYears] = useState(false);

  const params: EuSearchParams = { ...filters, lang };
  const searchQuery = useQuery({
    queryKey: queryKeys.euSearch(params),
    queryFn: () => fetchEuSearch(params),
    placeholderData: keepPreviousData,
  });

  function applyFilters(patch: Partial<EuSearchParams>) {
    setFilters((previous) => ({ ...previous, ...patch, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((previous) => ({ ...previous, page }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = euSearchParamsSchema.safeParse({
      ...filters,
      q: keyword.trim() || undefined,
      from: fromYear || undefined,
      to: toYear || undefined,
    });
    setInvalidYears(!parsed.success);
    if (parsed.success) setFilters({ ...parsed.data, page: 1 });
  }

  function renderResults() {
    if (searchQuery.isPending) return <LoadingState rows={5} />;
    if (searchQuery.isError) {
      return (
        <ErrorState error={searchQuery.error} onRetry={() => void searchQuery.refetch()} />
      );
    }

    const { results, hasMore, page } = searchQuery.data;
    if (!results.length) return <EmptyState message={t("noResults")} />;

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnCelex")}</TableHead>
                <TableHead>{t("columnTitle")}</TableHead>
                <TableHead>{t("columnType")}</TableHead>
                <TableHead>{t("columnDate")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead>{t("columnSource")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.celex}>
                  <TableCell className="font-mono text-xs">{result.celex}</TableCell>
                  {/* Titre CELLAR affiché tel quel : texte source, jamais traduit. */}
                  <TableCell className="min-w-72 whitespace-normal">{result.title}</TableCell>
                  <TableCell>{t(`types.${result.type}`)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateDDMMYYYY(result.date) ?? common("notAvailable")}
                  </TableCell>
                  <TableCell>
                    {/* Teinte neutre : c'est un état juridique, pas un statut d'assessment. */}
                    <Badge variant={result.inForce ? "secondary" : "outline"}>
                      {result.inForce ? t("statusInForce") : t("statusNotInForce")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a
                      href={result.eurlexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                    >
                      {t("openOnEurLex")}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("pageLabel", { page })}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || searchQuery.isFetching}
              onClick={() => goToPage(page - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore || page >= MAX_PAGE || searchQuery.isFetching}
              onClick={() => goToPage(page + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={keyword}
            maxLength={100}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("keywordPlaceholder")}
            aria-label={t("keywordPlaceholder")}
            className="pl-8"
          />
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={1950}
          value={fromYear}
          onChange={(event) => setFromYear(event.target.value)}
          placeholder={t("yearFrom")}
          aria-label={t("yearFrom")}
          className="w-28"
        />
        <Input
          type="number"
          inputMode="numeric"
          min={1950}
          value={toYear}
          onChange={(event) => setToYear(event.target.value)}
          placeholder={t("yearTo")}
          aria-label={t("yearTo")}
          className="w-28"
        />
        <Button type="submit" size="sm">
          {t("searchButton")}
        </Button>
      </form>
      {invalidYears ? (
        <p role="alert" className="text-xs text-destructive">
          {t("invalidYears")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) => applyFilters({ type: value as EuSearchParams["type"] })}
        >
          <SelectTrigger size="sm" aria-label={t("filterType")} className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {euSearchTypeSchema.options.map((type) => (
              <SelectItem key={type} value={type}>
                {t("filterType")}: {t(`types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.subject ?? ALL_SUBJECTS}
          onValueChange={(value) =>
            applyFilters({
              subject: value === ALL_SUBJECTS ? undefined : (value as EuSearchParams["subject"]),
            })
          }
        >
          <SelectTrigger size="sm" aria-label={t("filterSubject")} className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SUBJECTS}>
              {t("filterSubject")}: {common("all")}
            </SelectItem>
            {euSubjectSchema.options.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {t("filterSubject")}: {t(`subjects.${subject}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.inForce}
          onValueChange={(value) => applyFilters({ inForce: value as EuSearchParams["inForce"] })}
        >
          <SelectTrigger size="sm" aria-label={t("filterStatus")} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">
              {t("filterStatus")}: {t("statusInForce")}
            </SelectItem>
            <SelectItem value="all">
              {t("filterStatus")}: {t("statusAll")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => applyFilters({ sort: value as EuSearchParams["sort"] })}
        >
          <SelectTrigger size="sm" aria-label={t("sortLabel")} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              {t("sortLabel")}: {t("sortNewest")}
            </SelectItem>
            <SelectItem value="oldest">
              {t("sortLabel")}: {t("sortOldest")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderResults()}

      <p className="text-xs text-muted-foreground">{t("sourceNote")}</p>
    </div>
  );
}
