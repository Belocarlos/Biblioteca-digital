import { expect, test, type Page } from "@playwright/test";
import { login, makePdf, makePng } from "./fixtures";

/**
 * Fluxo completo: autor, recurso com PDF e capa, revisão, publicação,
 * pesquisa, filtros, página do documento, visualizador, descarregamento,
 * sessão associada e permissões. Todos os dados são de demonstração.
 */
test.describe.serial("Fluxo editorial completo", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  const TITLE = "[DEMO] Educação socioambiental em comunidades costeiras";
  let resourceAdminUrl = "";
  let resourceSlug = "";
  let resourceId = "";

  async function uploadIn(page: Page, inputId: string, file: { name: string; mimeType: string; buffer: Buffer }) {
    const form = page.locator("form", { has: page.locator(`#${inputId}`) });
    await form.locator(`#${inputId}`).setInputFiles(file);
    await form.getByRole("button", { name: /Carregar|Substituir/ }).click();
    return form;
  }

  test("o editor cria um perfil de autor", async ({ page }) => {
    await login(page, "editor");
    await page.goto("/admin/autores/novo");
    await page.locator("#f-name").fill("[DEMO] Ana Demonstração");
    await page.locator("#f-sort_name").fill("Demonstração, Ana");
    await page.locator("#f-specialization").fill("[DEMO] Educação ambiental");
    await page.locator("#f-institution").fill("[DEMO] Instituição de Demonstração");
    await page.locator("#f-country").fill("Portugal");
    await page.locator("#f-bio").fill("[DEMO] Perfil fictício utilizado apenas nos testes automáticos.");
    await page.locator("#f-links").fill("Página institucional | https://exemplo.org/demo");
    await page.getByLabel(/Publicar o perfil no diretório/).check();
    await page.getByRole("button", { name: "Criar perfil" }).click();
    await expect(page.getByText("Registo criado com sucesso.")).toBeVisible();

    // A autorização da fotografia é obrigatória.
    const form = page.locator("form", { has: page.locator("#upload-photo") });
    await form.locator("#upload-photo").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: await makePng("#163A5F", 300, 300) });
    await expect(form.getByLabel(/autorizou a utilização desta fotografia/)).toHaveAttribute("required", "");
    await form.getByLabel(/autorizou a utilização desta fotografia/).check();
    await form.getByRole("button", { name: "Carregar" }).click();
    await expect(form.getByText("Fotografia carregada.")).toBeVisible();
  });

  test("o editor cria um recurso com metadados, autor e coleção", async ({ page }) => {
    await login(page, "editor");
    await page.goto("/admin/recursos/novo");
    await page.locator("#f-title").fill(TITLE);
    await page.locator("#f-subtitle").fill("Estudo de caso");
    await page.locator("#f-resource_type").selectOption("article");
    await page.locator("#f-publication_year").fill("2024");
    await page.locator("#f-language").selectOption("pt");
    await page.locator("#f-country").fill("Portugal");
    await page.locator("#f-knowledge_area").fill("Ciências do Ambiente");
    await page.locator("#f-publisher").fill("[DEMO] Editora de Demonstração");
    await page.locator("#f-abstract").fill("Resumo de demonstração sobre justiça climática e participação comunitária em zonas costeiras.");
    await page.locator("#f-keywords").fill("educação ambiental, participação comunitária, litoral");
    await page.locator("#f-license").selectOption("CC-BY-4.0");
    await page.locator("#f-doi").fill("https://doi.org/10.5555/demo.2024.1");
    await page.getByPlaceholder("Pesquisar autores registados").fill("Ana Dem");
    await page.getByRole("button", { name: /\[DEMO\] Ana Demonstração/ }).click();
    await page.getByLabel("Educação e Conhecimento").check();
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page.getByText("Registo criado com sucesso.")).toBeVisible();
    resourceAdminUrl = page.url().replace(/\?.*$/, "");
    resourceId = resourceAdminUrl.split("/").pop()!;
    await expect(page.locator("#f-doi")).toHaveValue("10.5555/demo.2024.1");
    resourceSlug = await page.locator("#f-slug").inputValue();
    expect(resourceSlug).toBe("demo-educacao-socioambiental-em-comunidades-costeiras");
  });

  test("validação de ficheiros: PDF com JavaScript e ficheiro falso são recusados", async ({ page }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    let form = await uploadIn(page, "upload-file", {
      name: "malicioso.pdf",
      mimeType: "application/pdf",
      buffer: makePdf(["Teste"], "/OpenAction << /S /JavaScript /JS (app.alert(1)) >>"),
    });
    await expect(form.getByText(/conteúdo ativo/)).toBeVisible();
    form = await uploadIn(page, "upload-file", { name: "falso.pdf", mimeType: "application/pdf", buffer: Buffer.from("isto não é um pdf") });
    await expect(form.getByText("O ficheiro não é um PDF válido.")).toBeVisible();
    form = await uploadIn(page, "upload-cover", { name: "capa.png", mimeType: "image/png", buffer: Buffer.from("não é imagem") });
    await expect(form.getByText(/Formato de imagem não suportado/)).toBeVisible();
  });

  test("carregamento do PDF e da capa e definição de permissões", async ({ page }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    // Sem ficheiro, as permissões não podem ser ativadas.
    await page.getByLabel(/Permitir a leitura online/).check();
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText(/Carregue o ficheiro PDF antes de autorizar/)).toBeVisible();

    let form = await uploadIn(page, "upload-file", {
      name: "documento-demo.pdf",
      mimeType: "application/pdf",
      buffer: makePdf(["Pagina de demonstracao 1", "Pagina de demonstracao 2", "Pagina de demonstracao 3"]),
    });
    await expect(form.getByText("Ficheiro PDF carregado.")).toBeVisible();
    form = await uploadIn(page, "upload-cover", { name: "capa.png", mimeType: "image/png", buffer: await makePng() });
    await expect(form.getByText("Capa carregada.")).toBeVisible();

    await page.reload();
    await page.getByLabel(/Permitir a leitura online/).check();
    await page.getByLabel(/Permitir o descarregamento/).check();
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Alterações guardadas.").first()).toBeVisible();
  });

  test("o rascunho não é visível publicamente", async ({ page, request }) => {
    const res = await page.goto(`/biblioteca/${resourceSlug}`);
    expect(res?.status()).toBe(404);
    expect((await request.get(`/api/recursos/${resourceId}/pdf`)).status()).toBe(404);
    expect((await request.get(`/api/recursos/${resourceId}/descarregar`)).status()).toBe(404);
  });

  test("o editor envia para revisão, mas não pode aprovar", async ({ page }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
    await page.locator("#workflow-note").fill("Pronto para revisão.");
    await page.getByRole("button", { name: "Enviar para revisão" }).click();
    await expect(page.getByText("Estado editorial atualizado.")).toBeVisible();
    await expect(page.getByText("Em revisão").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
  });

  test("o revisor não edita metadados, mas aprova", async ({ page }) => {
    await login(page, "reviewer");
    await page.goto(resourceAdminUrl);
    await expect(page.locator("#f-title")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Guardar alterações" })).toHaveCount(0);
    await page.getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByText("Estado editorial atualizado.")).toBeVisible();
    await expect(page.getByText("Aprovado").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);
  });

  test("o editor publica o recurso aprovado", async ({ page }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Estado editorial atualizado.")).toBeVisible();
    await expect(page.getByText("Publicado").first()).toBeVisible();
    await expect(page.locator("#f-slug")).toHaveAttribute("readonly", "");
    await expect(page.getByText("Pronto para revisão.")).toBeVisible();
  });

  test("pesquisa por título, autor, palavra-chave e resumo", async ({ page }) => {
    const cases: [string, string][] = [
      ["socioambiental costeiras", "todos"],
      ["comunidades cost", "titulo"],
      ["Ana Demonstracao", "autor"],
      ["participação comunitária", "palavras-chave"],
      ["justica climatica", "resumo"],
      ["educacao", "todos"],
    ];
    for (const [q, campo] of cases) {
      await page.goto(`/biblioteca?q=${encodeURIComponent(q)}&campo=${campo}`);
      await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
      await expect(page.getByRole("heading", { name: /1 resultado/ })).toBeVisible();
    }
  });

  test("filtros combinados, ordenação e ausência de resultados", async ({ page }) => {
    await page.goto("/biblioteca");
    await page.getByLabel("Artigos científicos").check();
    await page.getByLabel("Área temática").selectOption("educacao-e-conhecimento");
    await page.getByLabel("De", { exact: true }).fill("2020");
    await page.getByLabel("Até", { exact: true }).fill("2025");
    await page.getByLabel("Idioma").selectOption("pt");
    await page.getByLabel("País").selectOption("Portugal");
    await page.getByLabel("Ordenar por").selectOption("ano-desc");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/tipo=article/);
    await expect(page).toHaveURL(/colecao=educacao-e-conhecimento/);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByRole("list", { name: "Filtros ativos" }).getByRole("link")).toHaveCount(6);

    await page.goto("/biblioteca?tipo=book&colecao=educacao-e-conhecimento");
    await expect(page.getByText("Não foram encontrados materiais para os critérios selecionados.")).toBeVisible();
    await expect(page.getByText("Sugestões para reformular a pesquisa:")).toBeVisible();
    await page.goto("/biblioteca?ano_de=2025");
    await expect(page.getByText("Não foram encontrados materiais para os critérios selecionados.")).toBeVisible();
    await page.goto("/biblioteca?q=inexistentexyz");
    await expect(page.getByText("Não foram encontrados materiais para os critérios selecionados.")).toBeVisible();
  });

  test("página do documento: metadados, referência, partilha e denúncia", async ({ page }) => {
    await page.goto(`/biblioteca/${resourceSlug}`);
    await expect(page).toHaveTitle(new RegExp(TITLE.replace(/[[\]]/g, "\\$&")));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
    const meta = page.getByRole("region", { name: "Informação bibliográfica" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Informação bibliográfica" }) }));
    await expect(meta.getByText("Artigo científico")).toBeVisible();
    await expect(meta.getByText("10.5555/demo.2024.1")).toBeVisible();
    await expect(meta.getByText(/Creative Commons Atribuição 4.0/)).toBeVisible();
    await expect(meta.getByText("[DEMO] Editora de Demonstração")).toBeVisible();
    await expect(page.getByRole("link", { name: "[DEMO] Ana Demonstração" }).first()).toHaveAttribute("href", "/autores/demo-ana-demonstracao");
    await expect(page.getByText("Demonstração, A. (2024).")).toBeVisible();

    await page.getByRole("button", { name: "Copiar referência" }).click();
    await expect(page.getByRole("button", { name: "Referência copiada" })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("Demonstração, A. (2024). [DEMO] Educação socioambiental em comunidades costeiras: Estudo de caso.");
    expect(clip).toContain("https://doi.org/10.5555/demo.2024.1");

    await page.getByRole("radio", { name: "ABNT" }).click();
    await expect(page.getByText(/DEMONSTRAÇÃO, Ana\./)).toBeVisible();

    await page.getByRole("button", { name: "Copiar endereço" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3100/biblioteca/${resourceSlug}`);

    await expect(page.getByRole("link", { name: "Comunicar à equipa editorial" })).toHaveAttribute("href", /^mailto:openlecture4all@gmail\.com\?subject=Den%C3%BAncia/);
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)["@type"]).toBe("ScholarlyArticle");
    await expect(page.locator('meta[name="citation_title"]')).toHaveAttribute("content", TITLE);
  });

  test("visualizador PDF integrado", async ({ page }) => {
    await page.goto(`/biblioteca/${resourceSlug}`);
    await page.getByRole("link", { name: "Ler online" }).click();
    await expect(page).toHaveURL(new RegExp(`/biblioteca/${resourceSlug}/leitor$`));
    await expect(page.getByText("de 3")).toBeVisible();
    await expect(page.locator('[data-page="1"] canvas')).toBeVisible();
    await expect(page.locator('[data-page="1"] .textLayer')).toContainText("Pagina de demonstracao 1");
    await page.getByRole("button", { name: "Página seguinte" }).click();
    await expect(page.locator("#pdf-page")).toHaveValue("2");
    await page.getByRole("button", { name: "Ampliar" }).click();
    await expect(page.getByRole("link", { name: "Descarregar" })).toBeVisible();
  });

  test("descarregamento autorizado e pedidos parciais", async ({ request }) => {
    const res = await request.get(`/api/recursos/${resourceId}/descarregar`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain("attachment");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const partial = await request.get(`/api/recursos/${resourceId}/pdf`, { headers: { Range: "bytes=0-99" } });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toMatch(/^bytes 0-99\//);
  });

  test("sem autorização, o descarregamento deixa de estar disponível", async ({ page, request }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    await page.getByLabel(/Permitir o descarregamento/).uncheck();
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Alterações guardadas.").first()).toBeVisible();
    await page.goto(`/biblioteca/${resourceSlug}`);
    await expect(page.getByRole("link", { name: /Descarregar PDF/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ler online" })).toBeVisible();
    expect((await request.get(`/api/recursos/${resourceId}/descarregar`)).status()).toBe(404);
  });

  test("criação de sessão com orador e apresentação associada", async ({ page }) => {
    await login(page, "editor");
    await page.goto("/admin/sessoes/novo");
    await page.locator("#f-title").fill("[DEMO] Justiça Climática e Ação Local");
    await page.locator("#f-summary").fill("[DEMO] Sessão fictícia utilizada nos testes automáticos.");
    await page.locator("#f-starts_at").fill("2026-03-12T18:00");
    await page.locator("#f-ends_at").fill("2026-03-12T19:30");
    await page.locator("#f-event_status").selectOption("held");
    await page.locator("#f-format").fill("Online");
    await page.locator("#f-topics").fill("Adaptação local\nParticipação comunitária");
    await page.getByPlaceholder("Pesquisar autores e oradores registados").fill("Ana");
    await page.getByRole("button", { name: /\[DEMO\] Ana Demonstração/ }).click();
    await page.getByPlaceholder("Pesquisar recursos").fill("socioambiental");
    await page.getByRole("button", { name: /Educação socioambiental/ }).click();
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page.getByText("Registo criado com sucesso.")).toBeVisible();
    const form = page.locator("form", { has: page.locator("#upload-poster") });
    await form.locator("#upload-poster").setInputFiles({ name: "cartaz.png", mimeType: "image/png", buffer: await makePng("#238C91", 800, 1000) });
    await form.getByRole("button", { name: "Carregar" }).click();
    await expect(form.getByText("Cartaz carregado.")).toBeVisible();

    // A gravação exige confirmação de autorização.
    await page.locator("#f-recording_url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Confirme a autorização para disponibilizar a gravação.").first()).toBeVisible();
    await page.locator("#f-recording_url").fill("");
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Alterações guardadas.").first()).toBeVisible();
  });

  test("o administrador publica a sessão e a sessão aparece no website", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/sessoes");
    await page.getByRole("link", { name: "[DEMO] Justiça Climática e Ação Local" }).click();
    await page.getByRole("button", { name: "Publicar diretamente" }).click();
    await expect(page.getByText("Estado editorial atualizado.")).toBeVisible();

    await page.goto("/sessoes");
    await page.getByRole("link", { name: "[DEMO] Justiça Climática e Ação Local" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[DEMO] Justiça Climática e Ação Local");
    await expect(page.getByText("12 de março de 2026").first()).toBeVisible();
    await expect(page.getByText("Realizada").first()).toBeVisible();
    await expect(page.getByText("A gravação desta sessão ainda não está disponível.")).toBeVisible();
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText("Participação comunitária")).toBeVisible();
    await expect(page.getByRole("link", { name: "[DEMO] Ana Demonstração" }).first()).toBeVisible();

    await page.goto(`/biblioteca/${resourceSlug}`);
    await expect(page.getByRole("link", { name: "[DEMO] Justiça Climática e Ação Local", exact: true })).toBeVisible();

    await page.goto("/autores/demo-ana-demonstracao");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[DEMO] Ana Demonstração");
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByRole("link", { name: "[DEMO] Justiça Climática e Ação Local", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Fotografia de \[DEMO\] Ana/ }).first()).toBeVisible();

    await page.goto("/autores?q=Demonstra");
    await expect(page.getByText("1 perfil")).toBeVisible();
  });

  test("a página inicial apresenta indicadores reais e recursos recentes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "recurso publicado", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "sessão documentada", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "autor registado", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByRole("link", { name: "[DEMO] Justiça Climática e Ação Local" }).first()).toBeVisible();
  });

  test("as estatísticas e o registo de atividade refletem a utilização", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/estatisticas");
    const row = page.getByRole("row", { name: new RegExp(TITLE.replace(/[[\]]/g, "\\$&")) }).first();
    await expect(row).toBeVisible();
    await page.goto("/admin/configuracoes/registo");
    await expect(page.getByText("Entrada no painel").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: new RegExp(`Recurso: ${TITLE.replace(/[[\]]/g, "\\$&")}`) }).first()).toBeVisible();
  });

  test("reorganização das coleções reflete-se no website", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/colecoes");
    await page.getByRole("button", { name: "Subir Mudanças Climáticas" }).click();
    await expect(page.getByRole("row").nth(1)).toContainText("Mudanças Climáticas");
    await page.goto("/colecoes");
    await expect(page.getByRole("list", { name: "Lista de coleções" }).getByRole("listitem").first()).toContainText("Mudanças Climáticas");
    await page.goto("/admin/colecoes");
    await page.getByRole("button", { name: "Descer Mudanças Climáticas" }).click();
    await expect(page.getByRole("row").nth(1)).toContainText("Ambiente e Sustentabilidade");
  });

  test("arquivar retira o recurso do website e só o administrador elimina publicados", async ({ page }) => {
    await login(page, "editor");
    await page.goto(resourceAdminUrl);
    await expect(page.getByRole("heading", { name: "Eliminar recurso" })).toHaveCount(0);
    await page.getByRole("button", { name: "Arquivar" }).click();
    await expect(page.getByText("Estado editorial atualizado.")).toBeVisible();
    expect((await page.goto(`/biblioteca/${resourceSlug}`))?.status()).toBe(404);

    await login(page, "admin");
    await page.goto(resourceAdminUrl);
    const del = page.getByRole("button", { name: "Eliminar definitivamente" });
    await expect(del).toBeDisabled();
    await page.getByLabel("Compreendo que a eliminação é definitiva.").check();
    page.once("dialog", (d) => d.accept());
    await del.click();
    await expect(page).toHaveURL(/\/admin\/recursos\?ok=eliminado/);
    await expect(page.getByText("Registo eliminado.")).toBeVisible();
  });
});
