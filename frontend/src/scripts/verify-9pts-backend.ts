import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const DEMO_EMAIL = "marie.lefevre@iabank.fr";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(`${BASE_URL}/fr/login`);
  await page.getByLabel("Adresse e-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /Se connecter/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "screenshots/verify9-dashboard-top.png", fullPage: true });

  // Point 3: cliquer sur une ligne (pas la flèche) doit naviguer.
  const firstRow = page.locator("table tbody tr").first();
  await firstRow.click();
  await page.waitForURL(/regulations\/EXT-/, { timeout: 10000 });
  console.log("Navigation par clic sur la ligne: OK ->", page.url());

  // Point 6: Overview a sa propre mindmap.
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/verify9-overview-mindmap.png", fullPage: true });

  console.log("Console errors:", consoleErrors.length ? consoleErrors : "aucune");
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
