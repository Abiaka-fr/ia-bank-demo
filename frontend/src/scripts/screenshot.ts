/**
 * Boucle de vérification visuelle obligatoire (frontend/CLAUDE.md).
 *
 * Usage : lancer `pnpm dev` dans un terminal, puis `pnpm screenshot`.
 * Les captures sont écrites dans `screenshots/` et doivent être comparées à
 * `docs/ui-guidelines.md` avant de considérer une tâche UI terminée.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.resolve(process.cwd(), "screenshots");
const VIEWPORT = { width: 1440, height: 900 } as const;
/** Laisse à MSW + TanStack Query le temps de peupler l'écran. */
const SETTLE_MS = 1200;

const routes = [
  { name: "fr-dashboard", path: "/fr/dashboard" },
  { name: "fr-regulations", path: "/fr/regulations" },
  { name: "fr-regulation-detail", path: "/fr/regulations/REG-ACPR-2026-04" },
  { name: "fr-impact-analysis", path: "/fr/impact-analysis" },
  { name: "fr-evidence-gap", path: "/fr/evidence/FND-003" },
  { name: "fr-evidence-no-procedure", path: "/fr/evidence/FND-004" },
  { name: "fr-copilot", path: "/fr/copilot" },
  { name: "en-dashboard", path: "/en/dashboard" },
  { name: "en-impact-analysis", path: "/en/impact-analysis" },
  { name: "en-evidence-gap", path: "/en/evidence/FND-003" },
] as const;

async function capture(page: Page, name: string, routePath: string) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${name}.png`),
    fullPage: true,
  });
  console.log(`✓ ${name} — ${routePath}`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  try {
    for (const route of routes) {
      await capture(page, route.name, route.path);
    }
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) {
    console.error("\nErreurs console relevées pendant la capture :");
    for (const error of consoleErrors) console.error(`  - ${error}`);
    process.exitCode = 1;
  }

  console.log(`\nCaptures écrites dans ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
