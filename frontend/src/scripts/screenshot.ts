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

const DEMO_EMAIL = "marie.lefevre@iabank.fr";
const DEMO_PASSWORD = "demo1234";
const ACPR_ID = "REG-ACPR-2026-04";

/** Onglet à ouvrir sur la page de détail d'une régulation, par libellé visible. */
type Route = { name: string; path: string; tab?: string };

const routes: readonly Route[] = [
  { name: "fr-dashboard", path: "/fr/dashboard" },
  { name: "fr-regulations", path: "/fr/regulations" },
  { name: "fr-regulation-overview", path: `/fr/regulations/${ACPR_ID}` },
  {
    name: "fr-regulation-actions",
    path: `/fr/regulations/${ACPR_ID}`,
    tab: "Analyse d'impact",
  },
  {
    name: "fr-regulation-requirements",
    path: `/fr/regulations/${ACPR_ID}`,
    tab: "Exigences extraites",
  },
  // Mise en avant venue de la carte mentale : REQ-005 touche deux procédures,
  // les deux lignes doivent ressortir.
  {
    name: "fr-focus-requirement",
    path: `/fr/regulations/${ACPR_ID}?tab=actions&focus=REQ-005`,
  },
  {
    name: "fr-regulation-source",
    path: `/fr/regulations/${ACPR_ID}?tab=source`,
  },
  { name: "fr-copilot", path: "/fr/copilot" },
  { name: "en-dashboard", path: "/en/dashboard" },
  { name: "en-regulations", path: "/en/regulations" },
  {
    name: "en-regulation-actions",
    path: `/en/regulations/${ACPR_ID}`,
    tab: "Impact analysis",
  },
];

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/fr/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "fr-login.png"),
    fullPage: true,
  });

  await page.getByLabel("Adresse e-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  console.log("✓ fr-login — /fr/login (connecté)");
}

async function capture(page: Page, route: Route) {
  await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(SETTLE_MS);

  if (route.tab) {
    await page.getByRole("tab", { name: new RegExp(route.tab) }).click();
    await page.waitForTimeout(SETTLE_MS);
  }

  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${route.name}.png`),
    fullPage: true,
  });
  console.log(`✓ ${route.name} — ${route.path}${route.tab ? ` (${route.tab})` : ""}`);
}

/**
 * La fenêtre de procédure ne s'atteint que par interaction : on la capture à part
 * pour qu'elle reste couverte par la boucle de vérification visuelle.
 */
async function captureProcedureDialog(page: Page) {
  await page.goto(`${BASE_URL}/fr/regulations/${ACPR_ID}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("tab", { name: /Analyse d'impact/ }).click();
  await page.waitForTimeout(SETTLE_MS);
  await page.getByRole("button", { name: "REQ-003" }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Ouvrir la procédure KYC-004/ }).click();
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "fr-procedure-dialog.png"),
  });
  console.log("✓ fr-procedure-dialog — fenêtre procédure, passage cité surligné");
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
    await signIn(page);
    for (const route of routes) {
      await capture(page, route);
    }
    await captureProcedureDialog(page);
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
