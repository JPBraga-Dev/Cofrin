import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("joao@cofrin.app");
  await page.getByLabel("Senha", { exact: true }).fill("CofrinDemo2026!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("login protege e abre a dashboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "O mesmo fluxo de autenticação já é coberto no projeto Chromium.");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await login(page);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
});

test("navegação financeira principal permanece funcional", async ({ page }, testInfo) => {
  await login(page);
  if (testInfo.project.name === "mobile") {
    for (const [label, path] of [["Lançamentos", "/transactions"], ["Porquinhos", "/piggy-banks"], ["Grupos", "/groups"]] as const) {
      await page.locator(".bottom-nav").getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(path));
    }
    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Cartões" }).click();
    await expect(page).toHaveURL(/\/cards/);
  } else {
    for (const [label, path] of [["Lançamentos", "/transactions"], ["Porquinhos", "/piggy-banks"], ["Grupos", "/groups"], ["Cartões", "/cards"]] as const) {
      await page.getByLabel("Navegação principal").getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(path));
    }
  }
});

test("logout volta a bloquear uma rota protegida", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "O menu da conta usa um fluxo móvel específico.");
  await login(page);
  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
