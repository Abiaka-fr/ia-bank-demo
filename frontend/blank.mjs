import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));

for (const url of ["http://localhost:3000/", "http://localhost:3000/fr/login"]) {
  msgs.length = 0;
  const res = await page.goto(url, { waitUntil: "networkidle" }).catch((e) => { msgs.push(`[goto] ${e.message}`); return null; });
  await page.waitForTimeout(2500);
  const bodyText = (await page.locator("body").innerText().catch(() => "")).trim();
  console.log(`\n=== ${url}`);
  console.log("  status:", res?.status(), "-> URL finale:", page.url());
  console.log("  texte visible:", bodyText ? JSON.stringify(bodyText.slice(0, 120)) : "(VIDE - page blanche)");
  const errs = msgs.filter((m) => m.startsWith("[error]") || m.startsWith("[pageerror]") || m.startsWith("[goto]"));
  console.log("  erreurs:", errs.length ? errs.slice(0, 6) : "aucune");
}
await page.screenshot({ path: "screenshots/debug-blank.png", fullPage: true });
await browser.close();
