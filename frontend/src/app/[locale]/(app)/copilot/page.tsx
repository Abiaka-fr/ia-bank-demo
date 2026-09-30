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
    // Hauteur fixe = écran moins barre du haut, bandeau et padding de <main> (~135 px,
    // mesuré desktop et mobile) : la page ne défile pas, seuls historique et messages défilent.
    // ponytail: décalage codé en dur — à réajuster si la barre du haut ou le bandeau changent.
    <div className="flex h-[calc(100svh-8.5rem)] flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <CopilotChat />
    </div>
  );
}
