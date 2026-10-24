import type { ResourceType } from "./constants";

export type CitationAuthor = { name: string; sortName?: string | null };

export type CitationInput = {
  title: string;
  subtitle?: string | null;
  authors: CitationAuthor[];
  year?: number | null;
  type: ResourceType;
  publisher?: string | null;
  doi?: string | null;
  isbn?: string | null;
  url: string;
  accessedAt?: Date;
};

const PARTICLES = new Set(["da", "de", "do", "das", "dos", "e", "d'", "van", "von", "del", "la"]);
const MONTHS_ABNT = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export function splitName(author: CitationAuthor): { family: string; given: string } {
  if (author.sortName && author.sortName.includes(",")) {
    const [family, ...rest] = author.sortName.split(",");
    return { family: family!.trim(), given: rest.join(",").trim() };
  }
  const tokens = author.name.trim().split(/\s+/);
  if (tokens.length === 1) return { family: tokens[0]!, given: "" };
  const family = tokens.pop()!;
  return { family, given: tokens.join(" ") };
}

function initials(given: string) {
  return given
    .split(/\s+/)
    .filter((t) => t && !PARTICLES.has(t.toLowerCase()))
    .map((t) =>
      t
        .split("-")
        .map((p) => `${p.charAt(0).toUpperCase()}.`)
        .join("-"),
    )
    .join(" ");
}

function fullTitle(input: CitationInput, separator = ": ") {
  const title = input.title.trim().replace(/[.:]+$/, "");
  return input.subtitle ? `${title}${separator}${input.subtitle.trim().replace(/[.]+$/, "")}` : title;
}

function locator(input: CitationInput) {
  if (input.doi) return `https://doi.org/${input.doi}`;
  return input.url;
}

/** Referência no estilo APA (7.ª edição). */
export function apaCitation(input: CitationInput) {
  const names = input.authors.map((a) => {
    const { family, given } = splitName(a);
    const ini = initials(given);
    return ini ? `${family}, ${ini}` : family;
  });
  let authorPart = "";
  if (names.length === 1) authorPart = names[0]!;
  else if (names.length === 2) authorPart = `${names[0]}, & ${names[1]}`;
  else if (names.length > 2 && names.length <= 20) authorPart = `${names.slice(0, -1).join(", ")}, & ${names.at(-1)}`;
  else if (names.length > 20) authorPart = `${names.slice(0, 19).join(", ")}, . . . ${names.at(-1)}`;

  const year = input.year ? `(${input.year})` : "(s.d.)";
  const title = `${fullTitle(input)}.`;
  const parts = authorPart ? [`${authorPart.replace(/\.$/, "")}.`, `${year}.`, title] : [title, `${year}.`];
  if (input.publisher) parts.push(`${input.publisher.replace(/\.$/, "")}.`);
  parts.push(locator(input));
  return parts.join(" ");
}

/** Referência no estilo ABNT (NBR 6023). */
export function abntCitation(input: CitationInput) {
  const formatted = input.authors.map((a) => {
    const { family, given } = splitName(a);
    return given ? `${family.toUpperCase()}, ${given}` : family.toUpperCase();
  });
  let authorPart = "";
  if (formatted.length > 3) authorPart = `${formatted[0]} et al.`;
  else if (formatted.length > 0) authorPart = formatted.join("; ");

  const accessed = input.accessedAt ?? new Date();
  const accessStr = `${accessed.getDate()} ${MONTHS_ABNT[accessed.getMonth()]} ${accessed.getFullYear()}`;
  const parts: string[] = [];
  if (authorPart) parts.push(`${authorPart.replace(/\.$/, "")}.`);
  parts.push(`${fullTitle(input)}.`);
  const pubYear = input.year ? String(input.year) : "[s.d.]";
  parts.push(input.publisher ? `${input.publisher.replace(/\.$/, "")}, ${pubYear}.` : `${pubYear}.`);
  if (input.isbn) parts.push(`ISBN ${input.isbn}.`);
  if (input.doi) parts.push(`DOI: ${input.doi}.`);
  parts.push(`Disponível em: ${locator(input)}. Acesso em: ${accessStr}.`);
  return parts.join(" ");
}
