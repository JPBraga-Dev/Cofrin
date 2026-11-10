import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { default: playwright } = await import(pathToFileURL("C:/Users/jpbra/Documents/GitHub/Cofrin/node_modules/playwright/index.js").href);
const { chromium } = playwright;

const output = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(output, "login.png"), fullPage: false });

await page.getByLabel("E-mail").fill("joao@cofrin.app");
await page.getByLabel("Senha", { exact: true }).fill("CofrinDemo2026!");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/dashboard/);
await page.getByRole("heading", { name: "Visão geral" }).waitFor();
await page.screenshot({ path: path.join(output, "dashboard.png"), fullPage: false });

await page.goto("http://localhost:5173/transactions", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Lançamentos" }).waitFor();
await page.screenshot({ path: path.join(output, "transactions.png"), fullPage: false });

await page.goto("http://localhost:5173/social", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Social" }).waitFor();
await page.screenshot({ path: path.join(output, "social.png"), fullPage: false });

await browser.close();
