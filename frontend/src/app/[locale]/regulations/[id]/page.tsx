import { setRequestLocale } from "next-intl/server";

import { RegulationDetailView } from "@/components/features/regulation-detail-view";

export default async function RegulationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RegulationDetailView regulationId={id} />;
}
