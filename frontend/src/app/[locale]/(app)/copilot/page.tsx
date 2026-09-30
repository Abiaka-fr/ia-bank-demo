import { getTranslations, setRequestLocale } from "next-intl/server";

import { CopilotChat } from "@/components/features/copilot-chat";
import { PageHeader } from "@/components/layout/page-header";

export default async function CopilotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "copilot" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <CopilotChat />
    </div>
  );
}
