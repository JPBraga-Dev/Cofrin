import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("joao@cofrin.app");
  await page.getByLabel("Senha").fill("CofrinDemo2026!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("login protege e abre a dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await login(page);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
});

test("navegação financeira principal permanece funcional", async ({ page }) => {
  await login(page);
  for (const [label, path] of [["Lançamentos", "/transactions"], ["Porquinhos", "/piggy-banks"], ["Grupos", "/groups"], ["Cartões", "/cards"]] as const) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(path));
  }
});

test("logout volta a bloquear uma rota protegida", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
