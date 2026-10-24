import { RESOURCE_TYPES, type ResourceType } from "./constants";
import { SEARCH_FIELDS, SORT_OPTIONS, type CatalogParams, type SearchField, type SortOption } from "./queries/public";

type Raw = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function int(v: string | undefined, min: number, max: number) {
  if (!v || !/^\d{1,4}$/.test(v)) return undefined;
  const n = Number(v);
  return n >= min && n <= max ? n : undefined;
}

export function parseCatalogParams(raw: Raw): CatalogParams {
  const typesRaw = raw.tipo === undefined ? [] : Array.isArray(raw.tipo) ? raw.tipo : [raw.tipo];
  const types = typesRaw.filter((t): t is ResourceType => (RESOURCE_TYPES as readonly string[]).includes(t));
  const field = first(raw.campo);
  const sort = first(raw.ordem);
  return {
    q: first(raw.q)?.slice(0, 200) || undefined,
    field: (SEARCH_FIELDS as readonly string[]).includes(field ?? "") ? (field as SearchField) : "todos",
    types,
    collection: first(raw.colecao)?.match(/^[a-z0-9-]{1,120}$/) ? first(raw.colecao) : undefined,
    yearFrom: int(first(raw.ano_de), 1000, 2200),
    yearTo: int(first(raw.ano_ate), 1000, 2200),
    language: first(raw.idioma)?.match(/^[a-z]{2,3}$/) ? first(raw.idioma) : undefined,
    country: first(raw.pais)?.slice(0, 80) || undefined,
    sort: (SORT_OPTIONS as readonly string[]).includes(sort ?? "") ? (sort as SortOption) : undefined,
    page: int(first(raw.pagina), 1, 9999) ?? 1,
  };
}

export function catalogQueryString(p: CatalogParams, overrides: Partial<CatalogParams> = {}) {
  const v = { ...p, ...overrides };
  const qs = new URLSearchParams();
  if (v.q) qs.set("q", v.q);
  if (v.q && v.field && v.field !== "todos") qs.set("campo", v.field);
  for (const t of v.types ?? []) qs.append("tipo", t);
  if (v.collection) qs.set("colecao", v.collection);
  if (v.yearFrom) qs.set("ano_de", String(v.yearFrom));
  if (v.yearTo) qs.set("ano_ate", String(v.yearTo));
  if (v.language) qs.set("idioma", v.language);
  if (v.country) qs.set("pais", v.country);
  if (v.sort) qs.set("ordem", v.sort);
  if (v.page && v.page > 1) qs.set("pagina", String(v.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}
