import { setRequestLocale } from "next-intl/server";

import { AuthGuard } from "@/components/layout/auth-guard";

export default async function AppShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AuthGuard>{children}</AuthGuard>;
}
