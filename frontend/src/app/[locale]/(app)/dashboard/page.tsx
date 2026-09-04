import { getTranslations, setRequestLocale } from "next-intl/server";

import { PortfolioDashboardView } from "@/components/features/portfolio-dashboard-view";
import { PageHeader } from "@/components/layout/page-header";

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
      <PageHeader title={t("title")} subtitle={t("portfolioSubtitle")} />
      <PortfolioDashboardView />
    </div>
  );
}
