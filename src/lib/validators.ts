import { z } from "zod";
import { LANGUAGES, LICENSES, RESOURCE_TYPES } from "./constants";
import { optionalUrl } from "./form-utils";

export function normalizeDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
}

export function normalizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(isbn: string) {
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = isbn.split("").reduce((acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = isbn.split("").reduce((acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}

const slugField = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Utilize apenas letras minúsculas sem acentos, números e hífenes.");

export const resourceSchema = z
  .object({
    title: z.string().trim().min(2, "Indique o título.").max(500),
    subtitle: z.string().trim().max(500),
    slug: slugField,
    resource_type: z.enum(RESOURCE_TYPES, { message: "Selecione o tipo de documento." }),
    publication_year: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1000 && Number(v) <= new Date().getFullYear() + 1), "Indique um ano válido."),
    language: z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]], { message: "Selecione o idioma." }),
    country: z.string().trim().max(80),
    knowledge_area: z.string().trim().max(160),
    publisher: z.string().trim().max(300),
    doi: z
      .string()
      .transform(normalizeDoi)
      .refine((v) => v === "" || /^10\.\d{4,9}\/\S+$/i.test(v), "O DOI deve ter o formato 10.xxxx/identificador."),
    isbn: z
      .string()
      .transform(normalizeIsbn)
      .refine((v) => v === "" || isValidIsbn(v), "O ISBN não é válido (10 ou 13 dígitos)."),
    abstract: z.string().trim().max(10000),
    keywords: z.string().trim().max(1000),
    license: z.enum(LICENSES.map((l) => l.code) as [string, ...string[]], { message: "Selecione a licença." }),
    license_details: z.string().trim().max(2000),
    rights_holder: z.string().trim().max(300),
    external_url: optionalUrl,
  });

export type ResourceInput = z.infer<typeof resourceSchema>;

export const sessionSchema = z.object({
  title: z.string().trim().min(2, "Indique o tema da sessão.").max(300),
  slug: slugField,
  summary: z.string().trim().max(600),
  description: z.string().trim().max(10000),
  starts_at: z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Data e hora inválidas."),
  ends_at: z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Data e hora inválidas."),
  timezone: z.string().trim().min(1).max(60),
  format: z.string().trim().max(200),
  topics: z.string().trim().max(4000),
  references_text: z.string().trim().max(8000),
  poster_alt: z.string().trim().max(300),
  recording_url: optionalUrl,
  event_status: z.enum(["scheduled", "held", "postponed", "cancelled"]),
});

export const authorSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome completo.").max(200),
  sort_name: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || v.includes(","), "Utilize o formato Apelido, Nome (com vírgula)."),
  slug: slugField,
  specialization: z.string().trim().max(200),
  country: z.string().trim().max(80),
  institution: z.string().trim().max(300),
  bio: z.string().trim().max(6000),
  photo_alt: z.string().trim().max(300),
  links: z.string().trim().max(3000),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome da coleção.").max(160),
  slug: slugField,
  description: z.string().trim().max(2000),
});

/** Interpreta ligações no formato "Etiqueta | https://endereço", uma por linha. */
export function parseLinks(text: string): { ok: true; links: { label: string; url: string }[] } | { ok: false; error: string } {
  const links: { label: string; url: string }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [labelPart, urlPart] = line.includes("|") ? line.split("|").map((s) => s.trim()) : [line, line];
    if (!urlPart || !/^https?:\/\/\S+$/i.test(urlPart)) return { ok: false, error: `Endereço inválido: "${line}". Utilize "Etiqueta | https://endereço".` };
    links.push({ label: (labelPart || urlPart).slice(0, 80), url: urlPart.slice(0, 500) });
  }
  return { ok: true, links: links.slice(0, 10) };
}
