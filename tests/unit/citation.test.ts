import { describe, expect, it } from "vitest";
import { abntCitation, apaCitation, splitName } from "@/lib/citation";

const base = {
  title: "Educação socioambiental",
  subtitle: "práticas comunitárias",
  type: "book" as const,
  year: 2024,
  publisher: "Editora Exemplo",
  url: "https://exemplo.org/biblioteca/educacao",
  accessedAt: new Date(2026, 9, 24),
};

describe("splitName", () => {
  it("usa o nome para referências quando existe", () => {
    expect(splitName({ name: "Maria João da Silva", sortName: "Silva, Maria João da" })).toEqual({ family: "Silva", given: "Maria João da" });
  });
  it("deduz o apelido a partir do último nome", () => {
    expect(splitName({ name: "Ana Costa" })).toEqual({ family: "Costa", given: "Ana" });
  });
});

describe("apaCitation", () => {
  it("formata um autor", () => {
    expect(apaCitation({ ...base, authors: [{ name: "Ana Costa" }] })).toBe(
      "Costa, A. (2024). Educação socioambiental: práticas comunitárias. Editora Exemplo. https://exemplo.org/biblioteca/educacao",
    );
  });
  it("formata dois autores com &", () => {
    const c = apaCitation({ ...base, authors: [{ name: "Ana Costa" }, { name: "Rui Pedro Lopes" }] });
    expect(c.startsWith("Costa, A., & Lopes, R. P. (2024).")).toBe(true);
  });
  it("ignora partículas nas iniciais e usa DOI quando existe", () => {
    const c = apaCitation({ ...base, doi: "10.1234/abc.5", authors: [{ name: "x", sortName: "Silva, Maria da Graça" }] });
    expect(c).toContain("Silva, M. G. (2024)");
    expect(c.endsWith("https://doi.org/10.1234/abc.5")).toBe(true);
  });
  it("indica sem data quando não há ano", () => {
    expect(apaCitation({ ...base, year: null, authors: [] })).toContain("(s.d.)");
  });
});

describe("abntCitation", () => {
  it("formata autores em maiúsculas e data de acesso", () => {
    const c = abntCitation({ ...base, authors: [{ name: "Ana Costa" }, { name: "Rui Lopes" }] });
    expect(c).toBe(
      "COSTA, Ana; LOPES, Rui. Educação socioambiental: práticas comunitárias. Editora Exemplo, 2024. Disponível em: https://exemplo.org/biblioteca/educacao. Acesso em: 24 out. 2026.",
    );
  });
  it("usa et al. com mais de três autores", () => {
    const c = abntCitation({ ...base, authors: [{ name: "A B" }, { name: "C D" }, { name: "E F" }, { name: "G H" }] });
    expect(c.startsWith("B, A et al.")).toBe(true);
  });
});
