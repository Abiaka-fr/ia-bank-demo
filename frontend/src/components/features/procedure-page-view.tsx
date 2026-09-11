"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { AwaitingBackendBadge } from "@/components/features/awaiting-backend-badge";
import { FindingsActionsTable } from "@/components/features/findings-actions-table";
import { ProcedureBody } from "@/components/features/procedure-body";
import { ErrorState, LoadingState } from "@/components/features/query-state";
import { RegulatoryScopeSelector } from "@/components/features/regulatory-scope-selector";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accessProfileForUser, canAnalyzeProcedures, canPrint } from "@/lib/access-profile";
import { analyzeProcedure, fetchProcedure } from "@/lib/api/procedures";
import { queryKeys } from "@/lib/api/query-keys";
import type { AnalyzeProcedureResponse, RegulatoryScope } from "@/types/api";

/**
 * Page dédiée en lecture seule pour une procédure — « ouvrir dans un nouvel onglet »
 * (Phase 6 § 5), pour le besoin « deuxième écran » de Francis pendant une revue.
 * Réutilise `ProcedureBody`, le même composant que `ProcedureEvidenceDialog`.
 *
 * `excerpt`/`section` viennent de l'URL (portés par le lien qui a ouvert cette page) :
 * ils décrivent le constat consulté, pas la procédure elle-même, donc ne peuvent pas
 * être déduits du seul identifiant de document.
 */
export function ProcedurePageView({ procedureId }: { procedureId: string }) {
  const t = useTranslations("procedureDialog");
  const common = useTranslations("common");
  const navT = useTranslations("nav");
  const searchParams = useSearchParams();
  const { user } = useSession();

  const excerpt = searchParams.get("excerpt") ?? "";
  const section = searchParams.get("section") ?? "";
  const regulationId = searchParams.get("regulationId");
  const requirementId = searchParams.get("requirementId");

  const analyzeT = useTranslations("procedureAnalysis");
  const [scope, setScope] = useState<RegulatoryScope>("BANK");
  const [result, setResult] = useState<AnalyzeProcedureResponse | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.procedure(procedureId),
    queryFn: () => fetchProcedure(procedureId),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeProcedure(procedureId, scope),
    onSuccess: (response) => {
      setResult(response);
      toast.success(analyzeT("succeeded"));
    },
    onError: () => toast.error(analyzeT("failed")),
  });

  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="mx-auto flex h-svh max-w-5xl flex-col gap-4 p-6">
      <div className="print:hidden">
        {regulationId && requirementId ? (
          // Nouvel onglet = pas d'historique de navigation à remonter (Phase 6 § 10) :
          // lien contextuel vers le constat d'origine plutôt qu'un fil d'Ariane
          // classique, qui n'aurait rien de hiérarchique à montrer ici.
          <BreadcrumbTrail
            items={[
              {
                label: t("backToFinding", { requirement: requirementId }),
                href: `/regulations/${regulationId}?tab=actions&focus=${requirementId}`,
              },
              { label: data.title },
            ]}
          />
        ) : (
          // Accès direct depuis `/procedures` (même onglet, historique de navigation
          // normal) : constat remonté par Giang, la page manquait tout de même un
          // chemin de retour visible vers la liste — corrigé le 2026-09-11.
          <BreadcrumbTrail
            items={[
              { label: navT("procedures"), href: "/procedures" },
              { label: data.title },
            ]}
          />
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <Badge variant="secondary" className="font-mono text-xs">
              {procedureId}
            </Badge>
            {data.title}
          </h1>
          {section ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("citedSection", { section })}
            </p>
          ) : null}
        </div>
        {canPrint(accessProfileForUser(user)) ? (
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            {common("print")}
          </Button>
        ) : null}
      </div>

      {/* Titre visible seulement à l'impression : le bandeau ci-dessus est masqué en
          `print:hidden` (bouton Imprimer, sans intérêt sur le papier). */}
      <h1 className="hidden text-lg font-semibold print:block">
        {procedureId} — {data.title}
      </h1>

      {/* Écran « Analyze » — Phase 6 § 2.2 / Phase 7 Jour 0 : sélecteur de scope +
          déclenchement de l'analyse Bank(+Europe), fusionnés sur cette même page
          plutôt qu'un écran séparé (décision de Francis, 2026-09-11). Masqué à
          l'impression : sans intérêt sur le papier, comme le reste des contrôles. */}
      {canAnalyzeProcedures(accessProfileForUser(user)) ? (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-sm">{analyzeT("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <RegulatoryScopeSelector
                value={scope}
                onChange={setScope}
                disabled={analyzeMutation.isPending}
              />
              <Button
                size="sm"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
              >
                <Play aria-hidden />
                {analyzeMutation.isPending ? analyzeT("analyzing") : analyzeT("analyzeButton")}
              </Button>
            </div>

            {result ? (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <p>
                    {analyzeT("bankRequirementsIdentified")}:{" "}
                    <span className="font-medium">{result.bank_requirements_identified}</span>
                  </p>
                  {scope === "BANK_PLUS_EU" ? (
                    <>
                      <p className="flex items-center gap-1.5">
                        {analyzeT("euCandidateRequirements")}:{" "}
                        {result.eu_candidate_requirements ?? (
                          <AwaitingBackendBadge field="AnalyzeProcedureResponse.eu_candidate_requirements" />
                        )}
                      </p>
                      <p className="flex items-center gap-1.5">
                        {analyzeT("additionalEuCandidates")}:{" "}
                        {result.additional_eu_candidates ?? (
                          <AwaitingBackendBadge field="AnalyzeProcedureResponse.additional_eu_candidates" />
                        )}
                      </p>
                    </>
                  ) : null}
                </div>

                {result.findings.length ? (
                  <FindingsActionsTable
                    findings={result.findings}
                    requirements={result.requirements}
                    // Sert uniquement de clé de cache pour l'invalidation après une
                    // décision (Accepter/Rejeter/Escalader) — ces constats ne sont
                    // pas rattachés à UNE régulation unique ici (direction inverse,
                    // Procédure → exigences), l'identifiant de procédure fait office
                    // de portée équivalente, sans effet indésirable : aucune requête
                    // n'est mise en cache sous cette clé ailleurs dans l'app.
                    regulationId={procedureId}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{analyzeT("noFindings")}</p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <ProcedureBody text={data.extracted_text} excerpt={excerpt} language={data.language} />
    </div>
  );
}
