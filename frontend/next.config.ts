import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Badge « N » (Next.js Dev Tools) en bas à gauche — visible seulement en `pnpm dev`,
  // jamais en production (Vercel), mais gênant pendant une démo lancée en local.
  devIndicators: false,
};

export default withNextIntl(nextConfig);
