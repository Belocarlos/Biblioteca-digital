import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

const PUBLIC_PAGES = ["/", "/biblioteca", "/sessoes", "/autores", "/colecoes", "/colecoes/mudancas-climaticas", "/sobre", "/contactos", "/submeter", "/politica-de-privacidade", "/termos-e-condicoes", "/admin/entrar"];

test.describe("Acessibilidade (WCAG 2.2 AA, verificação automática)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`sem violações graves em ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("painel administrativo sem violações graves", async ({ page }) => {
    await login(page, "admin");
    for (const path of ["/admin", "/admin/recursos", "/admin/recursos/novo", "/admin/sessoes/novo", "/admin/submissoes", "/admin/configuracoes"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });

  test("navegação por teclado: ligação para saltar para o conteúdo e foco visível", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("Responsividade", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("menu móvel e ausência de deslocamento horizontal", async ({ page }) => {
    for (const path of ["/", "/biblioteca", "/sessoes", "/autores", "/sobre", "/submeter", "/politica-de-privacidade"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Navegação principal (móvel)" }).getByRole("link", { name: "Coleções" }).click();
    await expect(page).toHaveURL("/colecoes");
    await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Qualidade técnica", () => {
  test("sem erros na consola do navegador nem violações de CSP", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const path of ["/", "/biblioteca", "/sessoes", "/sessoes/demo-justica-climatica-e-acao-local", "/autores", "/autores/demo-ana-demonstracao", "/colecoes", "/sobre", "/contactos", "/submeter", "/politica-de-privacidade"]) {
      await page.goto(path, { waitUntil: "networkidle" });
    }
    expect(errors).toEqual([]);
  });
});
