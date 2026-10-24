import "server-only";
import { cache } from "react";
import { sql } from "../db";
import type { EventStatus, ResourceType } from "../constants";
import { DEFAULT_CONTACT_EMAIL } from "../constants";

export type AuthorRef = { name: string; slug: string; sort_name: string | null; is_published: boolean };
export type CollectionRef = { name: string; slug: string };

export type ResourceCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  resource_type: ResourceType;
  publication_year: number | null;
  cover_key: string | null;
  authors: AuthorRef[];
  collection: CollectionRef | null;
};

const cardColumns = () => sql`
  r.id, r.slug, r.title, r.subtitle, r.resource_type, r.publication_year, r.cover_key,
  coalesce((
    select json_agg(json_build_object('name', a.name, 'slug', a.slug, 'sort_name', a.sort_name, 'is_published', a.is_published) order by ra.position)
    from resource_authors ra join authors a on a.id = ra.author_id
    where ra.resource_id = r.id
  ), '[]'::json) as authors,
  (
    select json_build_object('name', c.name, 'slug', c.slug)
    from resource_collections rc join collections c on c.id = rc.collection_id
    where rc.resource_id = r.id and c.is_published
    order by rc.position, c.position
    limit 1
  ) as collection
`;

// Pesquisa -----------------------------------------------------------------

export const SEARCH_FIELDS = ["todos", "titulo", "autor", "palavras-chave", "resumo"] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];
export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  todos: "Todos os campos",
  titulo: "Título",
  autor: "Autor",
  "palavras-chave": "Palavras-chave",
  resumo: "Resumo",
};

export const SORT_OPTIONS = ["relevancia", "recentes", "ano-desc", "ano-asc", "titulo"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: "Relevância",
  recentes: "Adicionados recentemente",
  "ano-desc": "Ano de publicação (mais recente)",
  "ano-asc": "Ano de publicação (mais antigo)",
  titulo: "Título (A a Z)",
};

export type CatalogParams = {
  q?: string;
  field?: SearchField;
  types?: ResourceType[];
  collection?: string;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  country?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
};

/** Converte o texto pesquisado numa expressão tsquery segura com prefixo no último termo. */
export function toTsQuery(q: string): string | null {
  const tokens = q
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 12);
  if (tokens.length === 0) return null;
  return tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(" & ");
}

export async function searchCatalog(params: CatalogParams) {
  const perPage = params.perPage ?? 12;
  const page = Math.max(1, params.page ?? 1);
  const q = params.q?.trim().slice(0, 200) ?? "";
  const tsq = q ? toTsQuery(q) : null;
  const field = params.field ?? "todos";
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  let textCondition = sql``;
  if (q) {
    if (field === "titulo") {
      textCondition = sql`and (app.unaccent_i(r.title) ilike app.unaccent_i(${like}) or app.unaccent_i(coalesce(r.subtitle, '')) ilike app.unaccent_i(${like}))`;
    } else if (field === "autor") {
      textCondition = sql`and exists (select 1 from resource_authors ra join authors a on a.id = ra.author_id
        where ra.resource_id = r.id and app.unaccent_i(a.name) ilike app.unaccent_i(${like}))`;
    } else if (field === "palavras-chave") {
      textCondition = sql`and exists (select 1 from unnest(r.keywords) k where app.unaccent_i(k) ilike app.unaccent_i(${like}))`;
    } else if (field === "resumo") {
      textCondition = tsq
        ? sql`and (to_tsvector('app.pt', coalesce(r.abstract, '')) @@ to_tsquery('app.pt', ${tsq}) or app.unaccent_i(coalesce(r.abstract, '')) ilike app.unaccent_i(${like}))`
        : sql`and false`;
    } else {
      textCondition = tsq
        ? sql`and (rs.document @@ to_tsquery('app.pt', ${tsq}) or app.unaccent_i(r.title) ilike app.unaccent_i(${like}))`
        : sql`and false`;
    }
  }

  const types = (params.types ?? []).filter(Boolean);
  const conditions = sql`
    r.status = 'published'
    ${textCondition}
    ${types.length ? sql`and r.resource_type = any(${types}::app.resource_type[])` : sql``}
    ${params.collection ? sql`and exists (select 1 from resource_collections rc join collections c on c.id = rc.collection_id where rc.resource_id = r.id and c.slug = ${params.collection})` : sql``}
    ${params.yearFrom ? sql`and r.publication_year >= ${params.yearFrom}` : sql``}
    ${params.yearTo ? sql`and r.publication_year <= ${params.yearTo}` : sql``}
    ${params.language ? sql`and r.language = ${params.language}` : sql``}
    ${params.country ? sql`and r.country = ${params.country}` : sql``}
  `;

  const sort = params.sort ?? (q ? "relevancia" : "recentes");
  const rank = tsq ? sql`ts_rank_cd(rs.document, to_tsquery('app.pt', ${tsq}))` : sql`0`;
  const orderBy =
    sort === "relevancia" && tsq
      ? sql`order by ${rank} desc, r.published_at desc`
      : sort === "ano-desc"
        ? sql`order by r.publication_year desc nulls last, r.title`
        : sort === "ano-asc"
          ? sql`order by r.publication_year asc nulls last, r.title`
          : sort === "titulo"
            ? sql`order by app.unaccent_i(r.title) asc`
            : sql`order by r.published_at desc, r.created_at desc`;

  const [countRow] = await sql<{ total: number }[]>`
    select count(*)::int as total
    from resources r left join resource_search rs on rs.resource_id = r.id
    where ${conditions}`;
  const total = countRow?.total ?? 0;

  const rows = await sql<ResourceCard[]>`
    select ${cardColumns()}
    from resources r left join resource_search rs on rs.resource_id = r.id
    where ${conditions}
    ${orderBy}
    limit ${perPage} offset ${(page - 1) * perPage}`;

  return { rows, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)), sort };
}

export const getCatalogFacets = cache(async () => {
  const [types, languages, countries, years, collections] = await Promise.all([
    sql<{ value: ResourceType; count: number }[]>`
      select resource_type as value, count(*)::int as count from resources where status = 'published'
      group by resource_type order by resource_type`,
    sql<{ value: string; count: number }[]>`
      select language as value, count(*)::int as count from resources where status = 'published'
      group by language order by count desc`,
    sql<{ value: string; count: number }[]>`
      select country as value, count(*)::int as count from resources where status = 'published' and country is not null
      group by country order by country`,
    sql<{ min: number | null; max: number | null }[]>`
      select min(publication_year) as min, max(publication_year) as max from resources where status = 'published'`,
    sql<{ value: string; label: string; count: number }[]>`
      select c.slug as value, c.name as label, count(r.id)::int as count
      from collections c
      left join resource_collections rc on rc.collection_id = c.id
      left join resources r on r.id = rc.resource_id and r.status = 'published'
      where c.is_published
      group by c.id order by c.position, c.name`,
  ]);
  return { types, languages, countries, years: years[0] ?? { min: null, max: null }, collections };
});

// Recursos -----------------------------------------------------------------

export type ResourceDetail = ResourceCard & {
  abstract: string | null;
  language: string;
  country: string | null;
  keywords: string[];
  knowledge_area: string | null;
  publisher: string | null;
  doi: string | null;
  isbn: string | null;
  license: string;
  license_details: string | null;
  rights_holder: string | null;
  external_url: string | null;
  file_key: string | null;
  file_size: number | null;
  allow_online_reading: boolean;
  allow_download: boolean;
  published_at: Date;
  updated_at: Date;
  collections: CollectionRef[];
  sessions: { title: string; slug: string; starts_at: Date | null; timezone: string }[];
};

export const getResourceBySlug = cache(async (slug: string) => {
  const rows = await sql<ResourceDetail[]>`
    select ${cardColumns()},
      r.abstract, r.language, r.country, r.keywords, r.knowledge_area, r.publisher, r.doi, r.isbn,
      r.license, r.license_details, r.rights_holder, r.external_url, r.file_key, r.file_size,
      r.allow_online_reading, r.allow_download, r.published_at, r.updated_at,
      coalesce((select json_agg(json_build_object('name', c.name, 'slug', c.slug) order by rc.position, c.position)
        from resource_collections rc join collections c on c.id = rc.collection_id
        where rc.resource_id = r.id and c.is_published), '[]'::json) as collections,
      coalesce((select json_agg(json_build_object('title', s.title, 'slug', s.slug, 'starts_at', s.starts_at, 'timezone', s.timezone) order by s.starts_at desc)
        from session_resources sr join program_sessions s on s.id = sr.session_id
        where sr.resource_id = r.id and s.status = 'published'), '[]'::json) as sessions
    from resources r
    where r.slug = ${slug} and r.status = 'published'`;
  return rows[0] ?? null;
});

export async function getRelatedResources(resourceId: string, limit = 4) {
  return sql<ResourceCard[]>`
    select ${cardColumns()}
    from resources r
    where r.status = 'published' and r.id <> ${resourceId}
      and exists (
        select 1 from resource_collections rc
        where rc.resource_id = r.id
          and rc.collection_id in (select collection_id from resource_collections where resource_id = ${resourceId})
      )
    order by r.published_at desc
    limit ${limit}`;
}

export async function getRecentResources(limit = 6) {
  return sql<ResourceCard[]>`
    select ${cardColumns()} from resources r
    where r.status = 'published'
    order by r.published_at desc
    limit ${limit}`;
}

/** Indicadores calculados a partir da base de dados. */
export async function getPublicStats() {
  const [row] = await sql<{ resources: number; sessions: number; authors: number }[]>`
    select
      (select count(*)::int from resources where status = 'published') as resources,
      (select count(*)::int from program_sessions where status = 'published') as sessions,
      (select count(*)::int from authors where is_published) as authors`;
  return row ?? { resources: 0, sessions: 0, authors: 0 };
}

export async function getResourceFileInfo(id: string) {
  const rows = await sql<
    { id: string; slug: string; title: string; file_key: string | null; file_name: string | null; allow_online_reading: boolean; allow_download: boolean }[]
  >`
    select id, slug, title, file_key, file_name, allow_online_reading, allow_download
    from resources where id = ${id} and status = 'published'`;
  return rows[0] ?? null;
}

// Coleções -----------------------------------------------------------------

export type CollectionSummary = { id: string; slug: string; name: string; description: string | null; count: number };

export async function getCollections() {
  return sql<CollectionSummary[]>`
    select c.id, c.slug, c.name, c.description,
      (select count(*)::int from resource_collections rc join resources r on r.id = rc.resource_id
       where rc.collection_id = c.id and r.status = 'published') as count
    from collections c
    where c.is_published
    order by c.position, c.name`;
}

export const getCollectionBySlug = cache(async (slug: string) => {
  const rows = await sql<CollectionSummary[]>`
    select c.id, c.slug, c.name, c.description,
      (select count(*)::int from resource_collections rc join resources r on r.id = rc.resource_id
       where rc.collection_id = c.id and r.status = 'published') as count
    from collections c where c.slug = ${slug} and c.is_published`;
  return rows[0] ?? null;
});

// Sessões ------------------------------------------------------------------

export type SessionCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  timezone: string;
  event_status: EventStatus;
  poster_key: string | null;
  poster_alt: string | null;
  speakers: AuthorRef[];
};

const sessionCardColumns = () => sql`
  s.id, s.slug, s.title, s.summary, s.starts_at, s.ends_at, s.timezone, s.event_status, s.poster_key, s.poster_alt,
  coalesce((
    select json_agg(json_build_object('name', a.name, 'slug', a.slug, 'sort_name', a.sort_name, 'is_published', a.is_published) order by ss.position)
    from session_speakers ss join authors a on a.id = ss.author_id
    where ss.session_id = s.id
  ), '[]'::json) as speakers
`;

export async function getSessions(filter: "todas" | "programadas" | "realizadas" = "todas", q?: string) {
  const like = q ? `%${q.trim().slice(0, 100).replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
  return sql<SessionCard[]>`
    select ${sessionCardColumns()}
    from program_sessions s
    where s.status = 'published'
      ${filter === "programadas" ? sql`and s.event_status in ('scheduled', 'postponed')` : sql``}
      ${filter === "realizadas" ? sql`and s.event_status = 'held'` : sql``}
      ${like ? sql`and (app.unaccent_i(s.title) ilike app.unaccent_i(${like}) or exists (
        select 1 from session_speakers ss join authors a on a.id = ss.author_id
        where ss.session_id = s.id and app.unaccent_i(a.name) ilike app.unaccent_i(${like})))` : sql``}
    order by
      case when s.event_status in ('scheduled', 'postponed') then 0 else 1 end,
      case when s.event_status in ('scheduled', 'postponed') then s.starts_at end asc nulls last,
      s.starts_at desc nulls last`;
}

export async function getFeaturedSessions(limit = 3) {
  return sql<SessionCard[]>`
    select ${sessionCardColumns()}
    from program_sessions s
    where s.status = 'published' and s.event_status <> 'cancelled'
    order by
      case when s.event_status in ('scheduled', 'postponed') and s.starts_at >= now() then 0 else 1 end,
      case when s.event_status in ('scheduled', 'postponed') and s.starts_at >= now() then s.starts_at end asc,
      s.starts_at desc nulls last
    limit ${limit}`;
}

export type SessionDetail = SessionCard & {
  description: string | null;
  format: string | null;
  topics: string[];
  references_text: string | null;
  recording_url: string | null;
  recording_authorized: boolean;
  published_at: Date;
  speaker_profiles: {
    name: string;
    slug: string;
    is_published: boolean;
    bio: string | null;
    specialization: string | null;
    institution: string | null;
    country: string | null;
    role: string;
    photo_key: string | null;
  }[];
  resources: (ResourceCard & { relation: string })[];
};

export const getSessionBySlug = cache(async (slug: string) => {
  const rows = await sql<SessionDetail[]>`
    select ${sessionCardColumns()},
      s.description, s.format, s.topics, s.references_text, s.recording_url, s.recording_authorized, s.published_at,
      coalesce((
        select json_agg(json_build_object(
          'name', a.name, 'slug', a.slug, 'is_published', a.is_published, 'bio', a.bio,
          'specialization', a.specialization, 'institution', a.institution, 'country', a.country, 'role', ss.role,
          'photo_key', case when a.photo_authorized and a.is_published then a.photo_key end
        ) order by ss.position)
        from session_speakers ss join authors a on a.id = ss.author_id where ss.session_id = s.id
      ), '[]'::json) as speaker_profiles
    from program_sessions s
    where s.slug = ${slug} and s.status = 'published'`;
  const session = rows[0];
  if (!session) return null;
  const resources = await sql<(ResourceCard & { relation: string })[]>`
    select ${cardColumns()}, sr.relation
    from session_resources sr join resources r on r.id = sr.resource_id
    where sr.session_id = ${session.id} and r.status = 'published'
    order by case sr.relation when 'presentation' then 0 when 'recording' then 1 else 2 end, sr.position`;
  session.resources = resources;
  return session;
});

// Autores ------------------------------------------------------------------

export type AuthorCard = {
  id: string;
  slug: string;
  name: string;
  specialization: string | null;
  country: string | null;
  institution: string | null;
  photo_key: string | null;
  photo_alt: string | null;
  resource_count: number;
  session_count: number;
};

const authorCardColumns = () => sql`
  a.id, a.slug, a.name, a.specialization, a.country, a.institution,
  case when a.photo_authorized then a.photo_key end as photo_key, a.photo_alt,
  (select count(*)::int from resource_authors ra join resources r on r.id = ra.resource_id
   where ra.author_id = a.id and r.status = 'published') as resource_count,
  (select count(*)::int from session_speakers ss join program_sessions s on s.id = ss.session_id
   where ss.author_id = a.id and s.status = 'published') as session_count
`;

export async function getAuthors(q?: string, area?: string) {
  const like = q ? `%${q.trim().slice(0, 100).replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
  return sql<AuthorCard[]>`
    select ${authorCardColumns()}
    from authors a
    where a.is_published
      ${like ? sql`and (app.unaccent_i(a.name) ilike app.unaccent_i(${like}) or app.unaccent_i(coalesce(a.specialization, '')) ilike app.unaccent_i(${like}) or app.unaccent_i(coalesce(a.institution, '')) ilike app.unaccent_i(${like}))` : sql``}
      ${area ? sql`and a.specialization = ${area}` : sql``}
    order by app.unaccent_i(coalesce(a.sort_name, a.name))`;
}

export async function getAuthorAreas() {
  return sql<{ value: string; count: number }[]>`
    select specialization as value, count(*)::int as count from authors
    where is_published and specialization is not null and specialization <> ''
    group by specialization order by specialization`;
}

export type AuthorDetail = AuthorCard & {
  bio: string | null;
  sort_name: string | null;
  links: { label: string; url: string }[];
  updated_at: Date;
};

export const getAuthorBySlug = cache(async (slug: string) => {
  const rows = await sql<AuthorDetail[]>`
    select ${authorCardColumns()}, a.bio, a.sort_name, a.links, a.updated_at
    from authors a where a.slug = ${slug} and a.is_published`;
  const author = rows[0];
  if (!author) return null;
  const [resources, sessions] = await Promise.all([
    sql<ResourceCard[]>`
      select ${cardColumns()} from resources r
      join resource_authors ra on ra.resource_id = r.id
      where ra.author_id = ${author.id} and r.status = 'published'
      order by r.publication_year desc nulls last, r.title`,
    sql<SessionCard[]>`
      select ${sessionCardColumns()} from program_sessions s
      join session_speakers ss2 on ss2.session_id = s.id
      where ss2.author_id = ${author.id} and s.status = 'published'
      order by s.starts_at desc nulls last`,
  ]);
  return { author, resources, sessions };
});

// Configurações e páginas institucionais ----------------------------------

export type SiteSettings = {
  contact_email: string;
  social_links: { label: string; url: string }[];
  og_image_key: string | null;
  home_about: string;
  about_md: string;
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from site_settings`;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    contact_email: typeof map.contact_email === "string" ? map.contact_email : DEFAULT_CONTACT_EMAIL,
    social_links: Array.isArray(map.social_links) ? (map.social_links as SiteSettings["social_links"]) : [],
    og_image_key: typeof map.og_image_key === "string" ? map.og_image_key : null,
    home_about: typeof map.home_about === "string" ? map.home_about : "",
    about_md: typeof map.about_md === "string" ? map.about_md : "",
  };
});

export async function getLegalDocument(slug: "politica-de-privacidade" | "termos-e-condicoes") {
  const rows = await sql<
    { slug: string; title: string; body_md: string; version: number; review_status: string; approved_at: Date | null; updated_at: Date }[]
  >`select slug, title, body_md, version, review_status, approved_at, updated_at from legal_documents where slug = ${slug}`;
  return rows[0] ?? null;
}

export async function getTeamAndPartners() {
  const [team, partners] = await Promise.all([
    sql<{ id: string; name: string; role_title: string | null; bio: string | null; photo_key: string | null }[]>`
      select id, name, role_title, bio, case when photo_authorized then photo_key end as photo_key
      from team_members where is_published order by position, name`,
    sql<{ id: string; name: string; url: string | null; description: string | null; logo_key: string | null }[]>`
      select id, name, url, description, logo_key
      from partners where is_published and partnership_confirmed order by position, name`,
  ]);
  return { team, partners };
}

export async function trackResourceEvent(resourceId: string, kind: "view" | "read" | "download") {
  try {
    await sql`select app.track_resource_event(${resourceId}::uuid, ${kind})`;
  } catch (error) {
    console.error("Falha ao registar estatística", error);
  }
}
