import { setRequestLocale } from "next-intl/server";

import { ProcedurePageView } from "@/components/features/procedure-page-view";

export default async function ProcedurePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ProcedurePageView procedureId={id} />;
}
