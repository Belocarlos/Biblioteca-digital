import { expect, test } from "@playwright/test";
import { login, USERS } from "./fixtures";

test.describe("Autenticação e permissões", () => {
  test("a área administrativa exige autenticação", async ({ page, request }) => {
    await page.goto("/admin/recursos");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    const res = await request.get("/admin/entrar");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
    const api = await request.get("/api/admin/recursos/00000000-0000-0000-0000-000000000000/ficheiro");
    expect(api.status()).toBe(401);
  });

  test("credenciais erradas são recusadas com mensagem genérica", async ({ page }) => {
    await page.goto("/admin/entrar");
    await page.getByLabel("E-mail").fill(USERS.editor.email);
    await page.getByLabel("Palavra-passe").fill("palavra-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou palavra-passe incorretos.")).toBeVisible();
    await page.getByLabel("Palavra-passe").fill("x");
    await page.getByLabel("E-mail").fill("nao-existe@demo.test");
    const done = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Entrar" }).click();
    await done;
    await expect(page.getByText("E-mail ou palavra-passe incorretos.")).toBeVisible();
  });

  test("bloqueio temporário após tentativas falhadas", async ({ page }) => {
    await page.goto("/admin/entrar");
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("E-mail").fill("bloqueio@demo.test");
      await page.getByLabel("Palavra-passe").fill(`errada-${i}`);
      const done = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/entrar"));
      await page.getByRole("button", { name: "Entrar" }).click();
      await done;
      await expect(page.getByText("E-mail ou palavra-passe incorretos.")).toBeVisible();
    }
    await page.getByLabel("E-mail").fill("bloqueio@demo.test");
    await page.getByLabel("Palavra-passe").fill("mais-uma");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText(/Demasiadas tentativas/)).toBeVisible();
  });

  test("o revisor não acede à gestão de utilizadores nem às configurações", async ({ page }) => {
    await login(page, "reviewer");
    await expect(page.getByRole("navigation", { name: "Menu do painel" }).last().getByRole("link", { name: "Utilizadores" })).toHaveCount(0);
    await page.goto("/admin/utilizadores");
    await expect(page).toHaveURL(/sem-permissao/);
    await page.goto("/admin/configuracoes");
    await expect(page).toHaveURL(/sem-permissao/);
    await page.goto("/admin/recursos/novo");
    await expect(page).toHaveURL(/sem-permissao/);
  });

  test("o editor não acede à gestão de utilizadores", async ({ page }) => {
    await login(page, "editor");
    await page.goto("/admin/utilizadores");
    await expect(page).toHaveURL(/sem-permissao/);
  });

  test("terminar sessão invalida o acesso", async ({ page }) => {
    await login(page, "editor");
    await page.getByRole("button", { name: "Terminar sessão" }).click();
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });

  test("o administrador cria uma conta com palavra-passe temporária e alteração obrigatória", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/utilizadores/novo");
    await page.locator("#f-name").fill("[DEMO] Nova Revisora");
    await page.locator("#f-email").fill("nova.revisora@demo.test");
    await page.locator("#f-role").selectOption("reviewer");
    await page.getByRole("button", { name: "Criar conta" }).click();
    const msg = page.getByText(/Palavra-passe temporária: /);
    await expect(msg).toBeVisible();
    const temp = (await msg.innerText()).match(/temporária: (\S+?)\./)![1]!;

    await page.context().clearCookies();
    await page.goto("/admin/entrar");
    await page.getByLabel("E-mail").fill("nova.revisora@demo.test");
    await page.getByLabel("Palavra-passe").fill(temp);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin\/conta\?obrigatorio=1/);
    await page.goto("/admin/recursos");
    await expect(page).toHaveURL(/\/admin\/conta/);
    await page.locator("#f-current").fill(temp);
    await page.locator("#f-password").fill("curta");
    await page.locator("#f-confirm").fill("curta");
    await page.getByRole("button", { name: "Alterar palavra-passe" }).click();
    await expect(page.getByText("A palavra-passe deve ter pelo menos 12 caracteres.")).toBeVisible();
    await page.locator("#f-current").fill(temp);
    await page.locator("#f-password").fill("Revisora-Demo-2026");
    await page.locator("#f-confirm").fill("Revisora-Demo-2026");
    await page.getByRole("button", { name: "Alterar palavra-passe" }).click();
    await expect(page).toHaveURL(/\/admin\?ok=palavra/);
    await expect(page.getByText("Palavra-passe alterada.")).toBeVisible();
  });
});
