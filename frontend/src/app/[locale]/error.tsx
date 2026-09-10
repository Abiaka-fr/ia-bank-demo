"use client";

// Filet de sécurité Next.js pour tout écran de la coquille `[locale]/…` : capture les erreurs de
// rendu non gérées par un `ErrorState` local (ex. exception inattendue dans un composant) pour
// éviter un écran blanc en production. Rendu à l'intérieur de `[locale]/layout.tsx`, donc
// `NextIntlClientProvider` est toujours disponible ici (contrairement à `global-error.tsx`).
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  useEffect(() => {
    // Le contrat produit exige de ne jamais avaler une erreur silencieusement.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{t("pageBody")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          {common("retry")}
        </Button>
        <Button asChild>
          <Link href="/dashboard">{t("backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
