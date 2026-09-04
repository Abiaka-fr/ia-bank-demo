import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegulationsView } from "@/components/features/regulations-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function RegulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "regulations" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <RegulationsView />
    </div>
  );
}
