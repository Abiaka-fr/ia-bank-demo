"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { categoricalColor } from "@/lib/assessment";
import type { DashboardSummary } from "@/types/api";

/**
 * Répartition des exigences par domaine. Une seule série, un seul axe Y
 * (`docs/ui-guidelines.md` § règles de graphique).
 */
export function DomainChart({
  data,
  label,
}: {
  data: DashboardSummary["by_domain"];
  label: string;
}) {
  const config: ChartConfig = { count: { label } };
  const rows = data.map((entry, index) => ({
    ...entry,
    fill: categoricalColor(index),
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="domain"
          width={120}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
