import type { ReactNode } from "react";

import "./globals.css";

/**
 * Racine minimale : la balise <html> est rendue par `app/[locale]/layout.tsx`,
 * qui seul connaît la langue courante.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
