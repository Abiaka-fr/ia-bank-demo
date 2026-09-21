import { setRequestLocale } from "next-intl/server";

import { FindingPageView } from "@/components/features/finding-page-view";

export const metadata = {
  title: "Finding Review",
};

export default async function FindingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <FindingPageView findingId={id} />;
}
