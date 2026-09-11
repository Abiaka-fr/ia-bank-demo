"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegulatoryScope } from "@/types/api";

/**
 * Sélecteur de périmètre d'analyse — Phase 7 D1, posé sur l'écran Procédure (Jour 0,
 * fusionné avec l'écran « Analyze » de phase-6 § 2.2). `Select` plutôt qu'un
 * `radio-group` : composant déjà utilisé partout ailleurs pour ce genre de choix
 * court (`LocaleToggle`, filtres de `regulations-view.tsx`) — pas de nouvelle
 * primitive shadcn à installer pour 2 options.
 */
export function RegulatoryScopeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: RegulatoryScope;
  onChange: (scope: RegulatoryScope) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("regulatoryScope");

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{t("label")}</label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as RegulatoryScope)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={t("label")} className="w-full sm:w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BANK">{t("bankOnly")}</SelectItem>
          <SelectItem value="BANK_PLUS_EU">{t("bankPlusEu")}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value === "BANK" ? t("bankOnlyHelp") : t("bankPlusEuHelp")}
      </p>
    </div>
  );
}
