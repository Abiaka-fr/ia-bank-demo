"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Toggle FR/EN — présent dès la Phase 1, pas repoussé au polish final
 * (voir frontend/CLAUDE.md § Bilingue).
 */
export function LocaleToggle() {
  const t = useTranslations("topBar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const labels: Record<Locale, string> = {
    fr: t("french"),
    en: t("english"),
  };

  function handleChange(nextLocale: string) {
    // `usePathname` de next-intl renvoie le chemin sans préfixe de langue ; on
    // réattache la query pour ne pas perdre le constat ouvert (?finding=...).
    const query = searchParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        locale: nextLocale as Locale,
      });
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        size="sm"
        aria-label={t("languageLabel")}
        className="w-[7.5rem]"
      >
        <Languages className="size-4 shrink-0" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
