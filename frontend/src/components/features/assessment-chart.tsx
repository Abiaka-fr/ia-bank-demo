"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { assessmentColorVar, assessmentSolidClass } from "@/lib/assessment";
import type { DashboardSummary } from "@/types/api";

/**
 * Répartition par statut d'évaluation. Le graphique réutilise les couleurs de statut
 * (et non la palette catégorielle) pour qu'un statut reste reconnaissable partout.
 */
export function AssessmentChart({
  data,
}: {
  data: DashboardSummary["by_assessment"];
}) {
  const t = useTranslations("assessment");

  const config: ChartConfig = Object.fromEntries(
    data.map((entry) => [entry.assessment, { label: t(entry.assessment) }]),
  );

  const rows = data.map((entry) => ({
    key: entry.assessment,
    label: t(entry.assessment),
    count: entry.count,
    fill: assessmentColorVar[entry.assessment],
  }));

  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" radius={4} />
        </BarChart>
      </ChartContainer>

      {/* Légende explicite : le statut n'est jamais porté par la couleur seule. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {data.map((entry) => (
          <li key={entry.assessment} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`size-2.5 rounded-sm ${assessmentSolidClass[entry.assessment]}`}
            />
            {t(entry.assessment)}
          </li>
        ))}
      </ul>
    </div>
  );
}
