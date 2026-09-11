import { ScrollText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PortfolioDashboardView } from "@/components/features/portfolio-dashboard-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("portfolioSubtitle")}
        actions={
          // CTA proéminent demandé par Francis (phase-6-francis-feedback.md § 2) : une
          // analyse d'impact démarre toujours depuis une régulation précise (upload ou
          // sélection dans la liste), il n'existe pas d'écran « Analyse d'impact »
          // global — ce bouton mène donc au point d'entrée le plus proche.
          <Button asChild>
            <Link href="/regulations">
              <ScrollText aria-hidden />
              {t("newAnalysisCta")}
            </Link>
          </Button>
        }
      />
      <PortfolioDashboardView />
    </div>
  );
}
