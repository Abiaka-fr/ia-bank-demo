import { getTranslations, setRequestLocale } from "next-intl/server";

import { UserManagementView } from "@/components/features/user-management-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "users" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <UserManagementView />
    </div>
  );
}
