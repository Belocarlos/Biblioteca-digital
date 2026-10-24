import { expect, test, type Page } from "@playwright/test";
import { login, makePdf } from "./fixtures";

async function fillSubmission(page: Page, title: string) {
  await page.locator("#f-submitter_name").fill("[DEMO] Pessoa Proponente");
  await page.locator("#f-submitter_email").fill("proponente@demo.test");
  await page.locator("#f-submitter_institution").fill("[DEMO] Universidade de Demonstração");
  await page.locator("#f-submitter_country").fill("Brasil");
  await page.locator("#f-title").fill(title);
  await page.locator("#f-material_type").selectOption("report");
  await page.locator("#f-authors_text").fill("[DEMO] Autor Um; [DEMO] Autora Dois");
  await page.locator("#f-abstract").fill("Resumo de demonstração com extensão suficiente para validação do formulário.");
  await page.locator("#f-keywords").fill("demonstração, teste");
  await page.locator("#f-license_info").fill("CC BY 4.0. Leitura online e descarregamento autorizados pelos autores.");
  await page.getByLabel(/Declaro que sou titular dos direitos/).check();
  await page.getByLabel(/Tomei conhecimento da/).check();
}

test.describe.serial("Submissão de materiais", () => {
  test("validação dos campos obrigatórios", async ({ page }) => {
    await page.goto("/submeter");
    await page.waitForTimeout(4200);
    await page.getByRole("button", { name: "Enviar submissão" }).click();
    await expect(page.getByText("Verifique os campos assinalados.")).toBeVisible();
    await expect(page.getByText("Indique o nome completo.")).toBeVisible();
    await expect(page.getByText("Envie o ficheiro PDF ou indique o link oficial do documento.")).toBeVisible();
    await expect(page.getByText("É necessário confirmar a declaração de autorização.")).toBeVisible();
  });

  test("envios demasiado rápidos ou com o campo-isco preenchido são recusados", async ({ page }) => {
    await page.goto("/submeter");
    await fillSubmission(page, "[DEMO] Envio automático");
    await page.locator("#f-external_url").fill("https://exemplo.org/doc");
    await page.getByRole("button", { name: "Enviar submissão" }).click();
    await expect(page.getByText(/Não foi possível validar o envio/)).toBeVisible();

    await page.goto("/submeter");
    await fillSubmission(page, "[DEMO] Envio com campo-isco");
    await page.locator("#f-external_url").fill("https://exemplo.org/doc");
    await page.locator("#website").evaluate((el: HTMLInputElement) => (el.value = "spam"));
    await page.waitForTimeout(4200);
    await page.getByRole("button", { name: "Enviar submissão" }).click();
    await expect(page.getByText(/Não foi possível validar o envio/)).toBeVisible();
  });

  test("PDF com conteúdo ativo é recusado", async ({ page }) => {
    await page.goto("/submeter");
    await fillSubmission(page, "[DEMO] PDF malicioso");
    await page.locator("#f-file").setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: makePdf(["x"], "/OpenAction << /S /Launch /F (cmd.exe) >>") });
    await page.waitForTimeout(4200);
    await page.getByRole("button", { name: "Enviar submissão" }).click();
    await expect(page.getByText(/conteúdo ativo/)).toBeVisible();
  });

  test("submissão válida fica pendente e não é publicada", async ({ page }) => {
    await page.goto("/submeter");
    await fillSubmission(page, "[DEMO] Relatório submetido");
    await page.locator("#f-file").setInputFiles({ name: "relatorio-demo.pdf", mimeType: "application/pdf", buffer: makePdf(["Relatorio de demonstracao"]) });
    await page.waitForTimeout(4200);
    await page.getByRole("button", { name: "Enviar submissão" }).click();
    await expect(page.getByRole("heading", { name: "Submissão recebida" })).toBeVisible();
    await expect(page.getByText(/SUB-\d{8}-[A-Z0-9]{6}/)).toBeVisible();
    await expect(page.getByText(/não é publicado automaticamente/)).toBeVisible();
    await page.goto("/biblioteca?q=Relat%C3%B3rio%20submetido");
    await expect(page.getByRole("heading", { name: "[DEMO] Relatório submetido" })).toHaveCount(0);
  });

  test("revisão editorial da submissão e conversão em recurso", async ({ page }) => {
    await login(page, "reviewer");
    await page.goto("/admin/submissoes?estado=pending");
    await page.getByRole("link", { name: "[DEMO] Relatório submetido" }).click();
    await expect(page.getByText("[DEMO] Universidade de Demonstração")).toBeVisible();
    await expect(page.getByRole("link", { name: /relatorio-demo\.pdf/ })).toBeVisible();
    await page.getByRole("button", { name: "Recusar" }).click();
    await expect(page.getByText("Indique na nota o motivo da recusa.")).toBeVisible();
    await page.getByRole("button", { name: "Iniciar análise" }).click();
    await expect(page.getByText("Estado da submissão atualizado.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preparar publicação" })).toHaveCount(0);

    await login(page, "editor");
    await page.goto("/admin/submissoes?estado=under_review");
    await page.getByRole("link", { name: "[DEMO] Relatório submetido" }).click();
    await page.getByRole("button", { name: "Converter em recurso" }).click();
    await expect(page).toHaveURL(/\/admin\/recursos\/[0-9a-f-]+\?ok=convertido/);
    await expect(page.getByText("Submissão convertida num recurso em rascunho.")).toBeVisible();
    await expect(page.locator("#f-title")).toHaveValue("[DEMO] Relatório submetido");
    await expect(page.getByText("Rascunho").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /\.pdf/ })).toBeVisible();
  });
});
