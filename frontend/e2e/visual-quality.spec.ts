import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 375, height: 812 },
] as const;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("joao@cofrin.app");
  await page.getByLabel("Senha", { exact: true }).fill("CofrinDemo2026!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("qualidade visual", () => {
  test("dashboard e segurança preservam proporção, responsividade e estabilidade visual", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "A matriz já cobre desktop, tablet e mobile.");
    await login(page);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

      const layout = await page.evaluate(() => {
        const rect = (selector: string) => {
          const bounds = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
          return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
        };
        const balance = rect(".balance-summary-reveal");
        const secondary = rect(".financial-stats");
        const dashboard = rect(".dashboard-page");
        return {
          documentWidth: document.documentElement.scrollWidth,
          dashboardWidth: dashboard?.width ?? 0,
          balance,
          secondary,
          income: rect(".income-stat"),
          expense: rect(".expense-stat"),
          committed: rect(".committed-card"),
        };
      });

      expect(layout.documentWidth, `${viewport.width}x${viewport.height} não pode ter overflow horizontal`).toBeLessThanOrEqual(viewport.width);
      expect(layout.dashboardWidth).toBeLessThanOrEqual(1480.5);
      expect(layout.balance).not.toBeNull();
      expect(layout.secondary).not.toBeNull();

      if (viewport.width >= 1280) {
        expect(layout.secondary!.x).toBeGreaterThan(layout.balance!.x);
        const balanceShare = layout.balance!.width / (layout.balance!.width + layout.secondary!.width);
        expect(balanceShare).toBeGreaterThanOrEqual(0.55);
        expect(balanceShare).toBeLessThanOrEqual(0.60);
        expect(Math.abs(layout.balance!.height - layout.secondary!.height)).toBeLessThanOrEqual(1);
        expect(layout.balance!.height).toBeGreaterThanOrEqual(220);
        expect(layout.balance!.height).toBeLessThanOrEqual(250);
      } else {
        expect(layout.secondary!.y).toBeGreaterThan(layout.balance!.y);
      }

      if (viewport.width > 520) {
        expect(layout.expense!.x).toBeGreaterThan(layout.income!.x);
        expect(layout.committed!.width).toBeGreaterThan(layout.income!.width);
      } else {
        expect(layout.expense!.y).toBeGreaterThan(layout.income!.y);
        expect(layout.committed!.y).toBeGreaterThan(layout.expense!.y);
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });

    for (const [route, selectors] of [
      ["/dashboard", [".dashboard-balance", ".financial-stats .stat-card", ".flow-card", ".category-card", ".dashboard-transaction-row"]],
      ["/piggy-banks", [".piggy-card"]],
      ["/groups", [".group-card"]],
      ["/profile", [".profile-social-row", ".profile-group-row"]],
      ["/settings?tab=security", [".settings-security-card", ".session-row"]],
    ] as const) {
      await page.goto(route);
      for (const selector of selectors) {
        const target = page.locator(selector).first();
        await expect(target).toBeVisible();
        const beforeGeometry = await target.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { width: rect.width, height: rect.height, padding: style.padding };
        });
        await target.hover();
        await page.waitForTimeout(180);
        const afterGeometry = await target.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { width: rect.width, height: rect.height, padding: style.padding };
        });
        expect(Math.abs(afterGeometry.width - beforeGeometry.width), `${route} ${selector} deve manter a largura`).toBeLessThan(0.01);
        expect(Math.abs(afterGeometry.height - beforeGeometry.height), `${route} ${selector} deve manter a altura`).toBeLessThan(0.01);
        expect(afterGeometry.padding, `${route} ${selector} deve manter o padding`).toBe(beforeGeometry.padding);
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/settings?tab=security");

    await expect(page.getByRole("tab", { name: "Segurança" })).toHaveAttribute("aria-selected", "true");
    const securityColumns = await page.locator(".settings-security-card").evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    const passwordColumnShare = securityColumns[0] / (securityColumns[0] + securityColumns[1]);
    expect(passwordColumnShare).toBeGreaterThanOrEqual(0.44);
    expect(passwordColumnShare).toBeLessThanOrEqual(0.46);
    for (const label of ["Senha atual", "Nova senha", "Confirmar nova senha"]) {
      const input = page.getByLabel(label, { exact: true });
      await expect(input).toHaveAttribute("type", "password");
      const wrapper = input.locator("..");
      await expect(wrapper.getByRole("button", { name: /Mostrar|Ocultar/ })).toBeVisible();
    }

    await expect(page.getByText("Mozilla/5.0", { exact: false })).toHaveCount(0);
    await expect(page.getByText(/Chrome|Edge|Firefox|Safari|Navegador não identificado/).first()).toBeVisible();

    const hasDarkAutofillRule = await page.evaluate(() => [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => rule.cssText.includes(":-webkit-autofill") && rule.cssText.includes("-webkit-text-fill-color"));
      } catch {
        return false;
      }
    }));
    expect(hasDarkAutofillRule).toBe(true);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const documentNode = await cdp.send("DOM.getDocument");
    const passwordNode = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "#current-password" });
    await cdp.send("CSS.forcePseudoState", { nodeId: passwordNode.nodeId, forcedPseudoClasses: ["autofill"] });
    const autofillStyle = await page.locator("#current-password").evaluate((input) => {
      const style = getComputedStyle(input);
      return { textFill: style.webkitTextFillColor, boxShadow: style.boxShadow, autocomplete: input.getAttribute("autocomplete") };
    });
    expect(autofillStyle.textFill).toBe("rgb(245, 245, 245)");
    expect(autofillStyle.boxShadow).toContain("rgb(13, 13, 15)");
    expect(autofillStyle.autocomplete).toBe("current-password");
  });
});
