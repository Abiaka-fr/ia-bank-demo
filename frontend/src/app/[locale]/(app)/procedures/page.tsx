import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProceduresView } from "@/components/features/procedures-view";
import { UploadProcedureDialog } from "@/components/features/upload-procedure-dialog";
import { PageHeader } from "@/components/layout/page-header";

/** Liste + upload des procédures internes — Phase 6 § 2.2 / Phase 7 Jour 0. */
export default async function ProceduresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "procedures" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<UploadProcedureDialog />}
      />
      <ProceduresView />
    </div>
  );
}
