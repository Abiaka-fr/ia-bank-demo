// Rendu par Next.js pour toute route sous `[locale]/…` sans page correspondante (ou un appel
// explicite à `notFound()`), pour ne jamais laisser un lien mort ouvrir un écran blanc.
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t("notFoundPageTitle")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{t("notFoundPageBody")}</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("backToDashboard")}</Link>
      </Button>
    </div>
  );
}
