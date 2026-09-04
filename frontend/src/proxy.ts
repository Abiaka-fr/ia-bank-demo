import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

// Next.js 16 : la convention `middleware.ts` est devenue `proxy.ts`.
export default createMiddleware(routing);

export const config = {
  // Exclut les fichiers statiques, les routes API et le worker MSW.
  matcher: "/((?!api|_next|_vercel|mockServiceWorker.js|.*\\..*).*)",
};
