import { expect, type Page } from "@playwright/test";

export const USERS = {
  admin: { email: "admin@demo.test", name: "[DEMO] Administração", role: "admin", password: "Demo-Admin-Passe-2026" },
  editor: { email: "editor@demo.test", name: "[DEMO] Edição", role: "editor", password: "Demo-Editor-Passe-2026" },
  reviewer: { email: "revisor@demo.test", name: "[DEMO] Revisão", role: "reviewer", password: "Demo-Revisor-Passe-2026" },
} as const;

export async function login(page: Page, who: keyof typeof USERS) {
  const u = USERS[who];
  await page.context().clearCookies();
  await page.goto("/admin/entrar");
  await page.getByLabel("E-mail").fill(u.email);
  await page.getByLabel("Palavra-passe").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Gera um PDF válido e mínimo com texto em cada página. */
export function makePdf(pages: string[], extra = ""): Buffer {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const text of pages) {
    const content = `BT /F1 18 Tf 72 720 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
    const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R ${extra} >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Imagem PNG simples gerada localmente (não é uma fotografia). */
export async function makePng(color = "#287D62", width = 600, height = 800): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}
