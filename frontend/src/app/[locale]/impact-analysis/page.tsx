import { getTranslations, setRequestLocale } from "next-intl/server";

import { ImpactAnalysisView } from "@/components/features/impact-analysis-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function ImpactAnalysisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "impact" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ImpactAnalysisView />
    </div>
  );
}
