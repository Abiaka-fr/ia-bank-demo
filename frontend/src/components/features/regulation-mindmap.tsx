"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PaginationControls } from "@/components/features/pagination-controls";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/features/query-state";
import { Link } from "@/i18n/navigation";
import { fetchRegulationMap } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";
import {
  assessmentColorVar,
  categoricalColor,
  humanStatusValues,
} from "@/lib/assessment";
import {
  isMapNodeFullyHandled,
  layoutMindmap,
  type MindmapInput,
  type MindmapNode,
} from "@/lib/mindmap-layout";
import type { Assessment, RegulationMapNode } from "@/types/api";

/** Régulations par page — uniquement en mode portefeuille (voir `regulationId`). */
const REGULATIONS_PER_PAGE = 5;

/**
 * Carte mentale Régulation → Exigence → Procédure.
 *
 * Les liaisons sont dessinées en SVG ; les nœuds restent des liens HTML posés
 * au-dessus, pour garder la navigation au clavier et un texte sélectionnable —
 * ce que du texte tracé en SVG ne donnerait pas.
 */
export function RegulationMindmap({
  regulationId,
}: {
  /**
   * Régulation unique (onglet « Vue d'ensemble » d'une régulation) : pas de
   * pagination, et la régulation reste affichée même entièrement traitée — c'est SA
   * propre page, elle n'a pas à disparaître d'elle-même. Omis = mode portefeuille
   * (écran d'accueil) : régulations entièrement traitées masquées, paginé.
   */
  regulationId?: string;
}) {
  const t = useTranslations("mindmap");
  const assessmentLabels = useTranslations("assessment");
  const statusLabels = useTranslations("humanStatus");
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.regulationMap(),
    queryFn: fetchRegulationMap,
  });

  if (isPending) return <LoadingState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const scoped = regulationId
    ? data.filter((regulation) => regulation.regulation_id === regulationId)
    : data.filter((regulation) => !isMapNodeFullyHandled(regulation));

  if (!scoped.length) return <EmptyState message={t("empty")} />;

  const pageCount = regulationId
    ? 1
    : Math.max(1, Math.ceil(scoped.length / REGULATIONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visible = regulationId
    ? scoped
    : scoped.slice(
        (currentPage - 1) * REGULATIONS_PER_PAGE,
        currentPage * REGULATIONS_PER_PAGE,
      );

  const assessmentOf = new Map<string, Assessment>();

  const roots: MindmapInput[] = visible.map(
    (regulation: RegulationMapNode, index) => ({
      id: regulation.regulation_id,
      label: regulation.title,
      sublabel: regulation.regulation_id,
      href: `/regulations/${regulation.regulation_id}`,
      colorIndex: index,
      children: regulation.requirements.map((requirement) => ({
        id: requirement.requirement_id,
        label: requirement.requirement_id,
        // Phase 6 § 2.1 (retour Francis : « I have just the ID number ») —
        // `normalized_requirement` existe déjà dans la réponse API mais n'était
        // jamais affiché ; `source_reference` passe en tooltip plutôt que de
        // disparaître (pas de 3e ligne disponible dans la largeur de colonne).
        sublabel: requirement.normalized_requirement,
        tooltip: requirement.source_reference,
        href: `/regulations/${regulation.regulation_id}?tab=actions&focus=${requirement.requirement_id}`,
        children: requirement.procedures.map((procedure) => {
          assessmentOf.set(procedure.finding_id, procedure.assessment);
          return {
            id: procedure.finding_id,
            label:
              procedure.procedure_id ?? assessmentLabels("NO_RELEVANT_PROCEDURE"),
            sublabel: statusLabels(procedure.human_status),
            // Phase 6 § 2.1 : `RegulationMapProcedure` n'a vraiment aucun titre côté
            // contrat (contrairement à l'exigence ci-dessus) — signalé au lieu d'être
            // caché. Seulement quand une procédure existe : `NO_RELEVANT_PROCEDURE`
            // n'a pas de titre à attendre, ce n'est pas une donnée manquante.
            awaitingBackendField: procedure.procedure_id
              ? "RegulationMapProcedure.procedure_title"
              : undefined,
            href: `/regulations/${regulation.regulation_id}?tab=actions&focus=${procedure.finding_id}`,
          };
        }),
      })),
    }),
  );

  const { nodes, edges, width, height } = layoutMindmap(roots);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ width, height, minWidth: "100%" }}
          role="tree"
          aria-label={t("title")}
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={width}
            height={height}
            aria-hidden
          >
            {edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                strokeWidth={1.5}
                stroke={categoricalColor(edge.colorIndex)}
                strokeOpacity={0.55}
              />
            ))}
          </svg>

          {nodes.map((node) => (
            <MindmapNodeBox
              key={node.id}
              node={node}
              assessment={assessmentOf.get(node.id)}
            />
          ))}
        </div>
      </div>

      {regulationId ? null : (
        <PaginationControls page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}

function MindmapNodeBox({
  node,
  assessment,
}: {
  node: MindmapNode;
  assessment: Assessment | undefined;
}) {
  const awaitingT = useTranslations("awaitingBackend");
  const branchColor = categoricalColor(node.colorIndex);
  const isRoot = node.depth === 0;

  const box = (
    <span
      className={cn(
        "flex h-full w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 shadow-sm transition-colors",
        node.href && "hover:bg-accent",
        isRoot && "font-medium",
      )}
      style={{ borderLeft: `3px solid ${branchColor}` }}
      // Texte complet du `sublabel` tronqué à l'écran (Phase 6 § 2.1) — la carte
      // mentale n'a pas la place pour une 3e ligne (source_reference, ex.).
      title={node.tooltip}
    >
      {/* Pastille de statut : seul endroit où la couleur d'`assessment` est
          reprise, avec le libellé porté par `title` pour ne pas dépendre d'elle. */}
      {assessment ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: assessmentColorVar[assessment] }}
        />
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs leading-tight" title={node.label}>
          {node.label}
        </span>
        {node.sublabel ? (
          <span className="block truncate text-[10px] leading-tight text-muted-foreground">
            {node.sublabel}
          </span>
        ) : null}
      </span>

      {/* Version compacte d'`AwaitingBackendBadge` (Phase 6 § 2.1) : le badge complet
          (icône + texte + `Tooltip` Radix) déborderait la largeur étroite d'un nœud —
          même icône, même texte de tooltip (`awaitingBackend.tooltip`), juste posé en
          `title` natif plutôt qu'un `Tooltip` complet. */}
      {node.awaitingBackendField ? (
        <span title={awaitingT("tooltip", { field: node.awaitingBackendField })}>
          <Wrench
            className="size-3 shrink-0 text-muted-foreground"
            aria-label={awaitingT("badge")}
          />
        </span>
      ) : null}
    </span>
  );

  return (
    <div
      className="absolute"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-selected={false}
    >
      {node.href ? (
        <Link
          href={node.href}
          className="block h-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {box}
        </Link>
      ) : (
        box
      )}
    </div>
  );
}

/** Légende des statuts, la carte ne pouvant pas porter un badge complet par nœud. */
export function MindmapLegend() {
  const assessmentLabels = useTranslations("assessment");
  const statusLabels = useTranslations("humanStatus");
  const t = useTranslations("mindmap");

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span>{t("legendStatuses")}</span>
      {(
        [
          "COVERED",
          "PARTIAL",
          "POTENTIAL_GAP",
          "NO_RELEVANT_PROCEDURE",
          "EXPERT_REVIEW",
        ] as const
      ).map((assessment) => (
        <span key={assessment} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: assessmentColorVar[assessment] }}
          />
          {assessmentLabels(assessment)}
        </span>
      ))}
      <span>
        · {t("legendReview", { statuses: humanStatusValues.map((status) => statusLabels(status)).join(" / ") })}
      </span>
    </div>
  );
}
