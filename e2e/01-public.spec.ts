import { expect, test } from "@playwright/test";

test.describe("Website público sem conteúdos", () => {
  test("página inicial identifica a biblioteca e não apresenta indicadores fictícios", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Biblioteca Digital Open Lecture4All");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biblioteca Digital Open Lecture4All");
    await expect(page.getByPlaceholder("Pesquisar livros, artigos, autores ou temas...").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explorar biblioteca" })).toHaveAttribute("href", "/biblioteca");
    await expect(page.getByRole("link", { name: "Consultar sessões" })).toHaveAttribute("href", "/sessoes");
    // Sem dados, não existem contadores nem zeros decorativos.
    await expect(page.getByLabel("Indicadores da biblioteca")).toHaveCount(0);
    await expect(page.getByText("Os materiais da biblioteca serão disponibilizados nesta secção após validação editorial.")).toBeVisible();
    // As nove coleções iniciais.
    for (const name of ["Ambiente e Sustentabilidade", "Mudanças Climáticas", "Educação e Conhecimento", "Investigação Científica", "Cultura, Arte e Sociedade", "Políticas Públicas", "Tecnologia e Inovação", "Cooperação Internacional e CPLP", "Desenvolvimento Comunitário"]) {
      await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
    }
  });

  test("ligações do menu principal e do rodapé", async ({ page }) => {
    const nav = [
      ["Início", "/", "Biblioteca Digital Open Lecture4All"],
      ["Biblioteca", "/biblioteca", "Biblioteca"],
      ["Sessões", "/sessoes", "Sessões Saberes em Rede"],
      ["Autores", "/autores", "Autores e oradores"],
      ["Coleções", "/colecoes", "Coleções temáticas"],
      ["Sobre Nós", "/sobre", "Sobre Nós"],
      ["Contactos", "/contactos", "Contactos"],
    ] as const;
    for (const [label, href, heading] of nav) {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(href);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
    for (const [label, heading] of [
      ["Política de Privacidade", "Política de Privacidade"],
      ["Termos e Condições", "Termos e Condições"],
    ]) {
      await page.goto("/");
      await page.getByRole("contentinfo").getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByText("Documento em revisão")).toBeVisible();
    }
    await page.goto("/");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "openlecture4all@gmail.com" })).toHaveAttribute("href", "mailto:openlecture4all@gmail.com");
    await expect(page.getByRole("contentinfo")).toContainText(String(new Date().getFullYear()));
  });

  test("política de privacidade e termos incluem as secções obrigatórias", async ({ page }) => {
    await page.goto("/politica-de-privacidade");
    for (const h of ["Responsável pelo tratamento", "Dados pessoais recolhidos", "Finalidades do tratamento", "Fundamentos jurídicos", "Armazenamento e proteção", "Partilha de dados", "Prazos de conservação", "Direitos dos titulares", "Como exercer os direitos", "Cookies", "Contacto"]) {
      await expect(page.getByRole("main").getByRole("heading", { name: new RegExp(`^\\d+\\. ${h}`) })).toBeVisible();
    }
    await page.goto("/termos-e-condicoes");
    for (const h of ["Identificação da plataforma", "Finalidade da biblioteca", "Condições de acesso", "Utilização permitida", "Direitos de autor", "Responsabilidade dos utilizadores", "Regras de submissão", "Denúncia de conteúdos", "Limitações de responsabilidade", "Atualizações dos termos", "Contacto institucional"]) {
      await expect(page.getByRole("main").getByRole("heading", { name: new RegExp(`^\\d+\\. ${h}`) })).toBeVisible();
    }
  });

  test("estados vazios do catálogo, sessões e autores", async ({ page }) => {
    await page.goto("/biblioteca");
    await expect(page.getByText("Os materiais da biblioteca serão disponibilizados nesta secção após validação editorial.")).toBeVisible();
    await page.goto("/sessoes");
    await expect(page.getByText("Ainda não existem sessões publicadas")).toBeVisible();
    await page.goto("/autores");
    await expect(page.getByText("Ainda não existem perfis publicados")).toBeVisible();
  });

  test("favicon, robots.txt, sitemap e cabeçalhos de segurança", async ({ request }) => {
    const ico = await request.get("/favicon.ico");
    expect(ico.status()).toBe(200);
    const svg = await request.get("/icon.svg");
    expect(svg.status()).toBe(200);
    expect(await svg.text()).toContain("#163A5F");
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toMatch(/Disallow: \/\s*$/m);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
    const home = await request.get("/");
    const h = home.headers();
    expect(h["x-robots-tag"]).toContain("noindex");
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
    const html = await home.text();
    expect(html).toContain('name="robots" content="noindex, nofollow');
    expect(html).toContain('rel="icon"');
  });

  test("página inexistente devolve 404", async ({ page }) => {
    const res = await page.goto("/biblioteca/nao-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });

  test("sem emojis, sem botões em pílula e sem selos de geração automática", async ({ page }) => {
    for (const path of ["/", "/biblioteca", "/sobre", "/submeter"]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\p{Emoji_Presentation}/u);
      expect(text).not.toMatch(/feito com ia|gerado por ia|made with ai/i);
      expect(text).not.toMatch(/—/);
      const pills = await page.locator("a, button").evaluateAll((els) =>
        els.filter((el) => {
          const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
          return el.getBoundingClientRect().height > 0 && r > 8;
        }).length,
      );
      expect(pills).toBe(0);
    }
  });
});
