import { getTranslations, setRequestLocale } from "next-intl/server";

import { KnowledgeBaseView } from "@/components/features/knowledge-base-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "knowledgeBase" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <KnowledgeBaseView />
    </div>
  );
}
