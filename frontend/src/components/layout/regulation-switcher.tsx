"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { useSelectedRegulation } from "@/components/providers/selected-regulation-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchRegulations } from "@/lib/api/regulations";

/** Sélecteur de régulation de la top bar — la sélection est partagée par tous les écrans. */
export function RegulationSwitcher() {
  const t = useTranslations("topBar");
  const { selectedRegulationId, selectRegulation } = useSelectedRegulation();

  const { data: regulations, isPending } = useQuery({
    queryKey: queryKeys.regulations(),
    queryFn: fetchRegulations,
  });

  // Première visite : on se positionne sur une régulation déjà analysée pour que la
  // démo ne démarre pas sur un écran vide.
  useEffect(() => {
    if (selectedRegulationId || !regulations?.length) return;
    const analyzed = regulations.find(
      (regulation) => regulation.status === "ANALYZED",
    );
    selectRegulation((analyzed ?? regulations[0]).document_id);
  }, [regulations, selectedRegulationId, selectRegulation]);

  if (isPending) return <Skeleton className="h-8 w-64" />;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <ScrollText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Select
        value={selectedRegulationId ?? ""}
        onValueChange={selectRegulation}
      >
        <SelectTrigger
          size="sm"
          aria-label={t("regulationLabel")}
          className="w-full min-w-0 max-w-md"
        >
          <SelectValue placeholder={t("selectRegulation")} />
        </SelectTrigger>
        <SelectContent>
          {regulations?.map((regulation) => (
            <SelectItem
              key={regulation.document_id}
              value={regulation.document_id}
            >
              {regulation.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
