import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FindingPageView } from "@/components/features/finding-page-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "findingPage" });
  return { title: t("findingDetail") };
}

export default async function FindingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <FindingPageView findingId={id} />;
}
