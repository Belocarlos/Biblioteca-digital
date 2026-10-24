import { describe, expect, it } from "vitest";
import { slugify, isValidSlug } from "@/lib/slug";
import { toTsQuery } from "@/lib/queries/public";
import { isValidIsbn, normalizeDoi, normalizeIsbn, parseLinks } from "@/lib/validators";
import { toVideoEmbed } from "@/lib/video";
import { keywords } from "@/lib/form-utils";
import { utcToZonedLocal, zonedLocalToUtc } from "@/lib/format";
import { allowedTransitions } from "@/lib/workflow";
import { licenseInfo } from "@/lib/constants";

describe("slugify", () => {
  it("remove acentos e pontuação", () => {
    expect(slugify("Justiça Climática e Ação Local!")).toBe("justica-climatica-e-acao-local");
  });
  it("limita o comprimento sem cortar palavras", () => {
    const s = slugify("palavra ".repeat(30), 30);
    expect(s.length).toBeLessThanOrEqual(30);
    expect(isValidSlug(s)).toBe(true);
  });
});

describe("toTsQuery", () => {
  it("cria prefixo no último termo e ignora operadores", () => {
    expect(toTsQuery("educação ambien")).toBe("educação & ambien:*");
    expect(toTsQuery("a & b | !c")).toBe("a & b & c:*");
    expect(toTsQuery("  ")).toBeNull();
    expect(toTsQuery("'); drop table x; --")).toBe("drop & table & x:*");
  });
});

describe("identificadores", () => {
  it("normaliza DOI", () => {
    expect(normalizeDoi("https://doi.org/10.1000/xyz")).toBe("10.1000/xyz");
  });
  it("valida ISBN-10 e ISBN-13", () => {
    expect(isValidIsbn(normalizeIsbn("978-0-306-40615-7"))).toBe(true);
    expect(isValidIsbn(normalizeIsbn("0-306-40615-2"))).toBe(true);
    expect(isValidIsbn("9780306406158")).toBe(false);
  });
});

describe("parseLinks", () => {
  it("aceita Etiqueta | URL", () => {
    expect(parseLinks("ORCID | https://orcid.org/0000\nhttps://exemplo.org")).toEqual({
      ok: true,
      links: [
        { label: "ORCID", url: "https://orcid.org/0000" },
        { label: "https://exemplo.org", url: "https://exemplo.org" },
      ],
    });
  });
  it("rejeita esquemas inseguros", () => {
    expect(parseLinks("X | javascript:alert(1)").ok).toBe(false);
  });
});

describe("toVideoEmbed", () => {
  it("converte YouTube para youtube-nocookie", () => {
    expect(toVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(toVideoEmbed("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe("youtube");
  });
  it("converte Vimeo com dnt", () => {
    expect(toVideoEmbed("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789?dnt=1");
  });
  it("devolve null para outros endereços", () => {
    expect(toVideoEmbed("https://exemplo.org/video.mp4")).toBeNull();
  });
});

describe("keywords", () => {
  it("separa, remove duplicados e espaços", () => {
    expect(keywords(" clima, educação;clima , ,  justiça  climática")).toEqual(["clima", "educação", "justiça climática"]);
  });
});

describe("fusos horários", () => {
  it("converte hora local de Lisboa para UTC e de volta (verão e inverno)", () => {
    const summer = zonedLocalToUtc("2026-07-10T18:00", "Europe/Lisbon")!;
    expect(summer.toISOString()).toBe("2026-07-10T17:00:00.000Z");
    const winter = zonedLocalToUtc("2026-12-10T18:00", "Europe/Lisbon")!;
    expect(winter.toISOString()).toBe("2026-12-10T18:00:00.000Z");
    expect(utcToZonedLocal(summer, "Europe/Lisbon")).toBe("2026-07-10T18:00");
    expect(zonedLocalToUtc("2026-07-10T18:00", "America/Sao_Paulo")!.toISOString()).toBe("2026-07-10T21:00:00.000Z");
  });
});

describe("fluxo editorial (interface)", () => {
  it("o revisor apenas aprova ou devolve conteúdos em revisão", () => {
    expect(allowedTransitions("reviewer", "draft")).toEqual([]);
    expect(allowedTransitions("reviewer", "in_review").map((t) => t.to)).toEqual(["approved", "draft"]);
    expect(allowedTransitions("reviewer", "approved").map((t) => t.to)).toEqual(["draft"]);
  });
  it("o editor não aprova", () => {
    expect(allowedTransitions("editor", "in_review").map((t) => t.to)).toEqual(["draft"]);
    expect(allowedTransitions("editor", "approved").map((t) => t.to)).toContain("published");
  });
});

describe("licenças", () => {
  it("todos os direitos reservados não permite redistribuição por si só", () => {
    expect(licenseInfo("all-rights-reserved").permitsRedistribution).toBe(false);
    expect(licenseInfo("CC-BY-4.0").permitsRedistribution).toBe(true);
  });
});
