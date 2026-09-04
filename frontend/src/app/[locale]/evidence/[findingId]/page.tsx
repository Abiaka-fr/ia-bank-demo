import { getTranslations, setRequestLocale } from "next-intl/server";

import { EvidenceView } from "@/components/features/evidence-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; findingId: string }>;
}) {
  const { locale, findingId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "evidence" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <EvidenceView findingId={findingId} />
    </div>
  );
}
