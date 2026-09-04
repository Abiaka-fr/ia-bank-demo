import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByLabel("Adresse e-mail").fill("marie.lefevre@iabank.fr");
await page.getByLabel("Mot de passe").fill("demo1234");
await page.getByRole("button", { name: "Se connecter" }).click();
await page.waitForURL("**/dashboard", { timeout: 15000 });
await page.waitForTimeout(2000);
const txt = (await page.locator("main").innerText()).trim();
console.log("URL:", page.url());
console.log("contenu main:", JSON.stringify(txt.slice(0, 100)));
console.log("erreurs:", errs.length ? errs.slice(0, 5) : "aucune");
await browser.close();
