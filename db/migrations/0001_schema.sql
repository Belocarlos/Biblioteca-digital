-- Biblioteca Digital Open Lecture4All
-- Migração 0001: extensões, tipos, tabelas e índices.

create extension if not exists unaccent;
create extension if not exists pg_trgm;
create extension if not exists citext;

create schema if not exists app;
create schema if not exists private;

-- Configuração de pesquisa em português, sem distinção de acentos.
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'pt' and cfgnamespace = 'app'::regnamespace) then
    create text search configuration app.pt (copy = pg_catalog.portuguese);
    alter text search configuration app.pt
      alter mapping for hword, hword_part, word with unaccent, portuguese_stem;
  end if;
end $$;

create or replace function app.unaccent_i(text)
returns text
language sql
immutable
parallel safe
strict
as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Tipos enumerados ----------------------------------------------------------

create type app.user_role as enum ('admin', 'editor', 'reviewer');

create type app.editorial_status as enum ('draft', 'in_review', 'approved', 'published', 'archived');

create type app.resource_type as enum (
  'book', 'article', 'thesis', 'presentation', 'report',
  'guide', 'recording', 'supplementary', 'institutional'
);

create type app.event_status as enum ('scheduled', 'held', 'postponed', 'cancelled');

create type app.submission_status as enum ('pending', 'under_review', 'accepted', 'rejected');

-- Utilizadores e autenticação ---------------------------------------------

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  name text not null check (char_length(name) between 2 and 160),
  role app.user_role not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table private.sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);
create index sessions_user_idx on private.sessions(user_id);
create index sessions_expires_idx on private.sessions(expires_at);

create table private.login_attempts (
  id bigserial primary key,
  email citext,
  ip_hash text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_idx on private.login_attempts(email, created_at desc);
create index login_attempts_ip_idx on private.login_attempts(ip_hash, created_at desc);

create table private.rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_events_bucket_idx on private.rate_events(bucket, created_at desc);

-- Autores e oradores ------------------------------------------------------

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 200),
  sort_name text,
  specialization text,
  country text,
  institution text,
  bio text,
  photo_key text,
  photo_alt text,
  photo_authorized boolean not null default false,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  is_published boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authors_photo_requires_authorization check (photo_key is null or photo_authorized)
);
create index authors_name_trgm_idx on public.authors using gin (app.unaccent_i(name) gin_trgm_ops);

-- Coleções temáticas ------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  description text,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_position_idx on public.collections(position);

-- Recursos da biblioteca --------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 500),
  subtitle text,
  abstract text,
  resource_type app.resource_type not null,
  publication_year integer check (publication_year between 1000 and 2200),
  language text not null default 'pt' check (language ~ '^[a-z]{2,3}$'),
  country text,
  keywords text[] not null default '{}',
  knowledge_area text,
  publisher text,
  doi text check (doi is null or doi ~* '^10\.[0-9]{4,9}/\S+$'),
  isbn text,
  license text not null default 'all-rights-reserved',
  license_details text,
  rights_holder text,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  file_key text,
  file_name text,
  file_size bigint,
  cover_key text,
  allow_online_reading boolean not null default false,
  allow_download boolean not null default false,
  status app.editorial_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_download_requires_file check (not allow_download or file_key is not null),
  constraint resources_reading_requires_file check (not allow_online_reading or file_key is not null)
);
create index resources_status_idx on public.resources(status, published_at desc);
create index resources_type_idx on public.resources(resource_type);
create index resources_year_idx on public.resources(publication_year);
create index resources_title_trgm_idx on public.resources using gin (app.unaccent_i(title) gin_trgm_ops);

create table public.resource_search (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  document tsvector not null
);
create index resource_search_document_idx on public.resource_search using gin (document);

create table public.resource_authors (
  resource_id uuid not null references public.resources(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  position integer not null default 0,
  primary key (resource_id, author_id)
);
create index resource_authors_author_idx on public.resource_authors(author_id);

create table public.resource_collections (
  resource_id uuid not null references public.resources(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete restrict,
  position integer not null default 0,
  primary key (resource_id, collection_id)
);
create index resource_collections_collection_idx on public.resource_collections(collection_id);

-- Sessões Saberes em Rede -------------------------------------------------

create table public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 300),
  summary text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Europe/Lisbon',
  format text,
  topics text[] not null default '{}',
  references_text text,
  poster_key text,
  poster_alt text,
  recording_url text check (recording_url is null or recording_url ~* '^https?://'),
  recording_authorized boolean not null default false,
  event_status app.event_status not null default 'scheduled',
  status app.editorial_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_sessions_dates check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint program_sessions_recording_requires_authorization check (recording_url is null or recording_authorized)
);
create index program_sessions_status_idx on public.program_sessions(status, starts_at desc);

create table public.session_speakers (
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  position integer not null default 0,
  role text not null default 'speaker' check (role in ('speaker', 'moderator')),
  primary key (session_id, author_id)
);
create index session_speakers_author_idx on public.session_speakers(author_id);

create table public.session_resources (
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  relation text not null default 'related' check (relation in ('presentation', 'recording', 'related')),
  position integer not null default 0,
  primary key (session_id, resource_id)
);
create index session_resources_resource_idx on public.session_resources(resource_id);

-- Página Sobre Nós: equipa e parceiros ------------------------------------

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  role_title text,
  bio text,
  photo_key text,
  photo_authorized boolean not null default false,
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_photo_requires_authorization check (photo_key is null or photo_authorized)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  url text check (url is null or url ~* '^https?://'),
  description text,
  logo_key text,
  partnership_confirmed boolean not null default false,
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_publish_requires_confirmation check (not is_published or partnership_confirmed)
);

-- Configurações e documentos jurídicos ------------------------------------

create table public.site_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.legal_documents (
  slug text primary key check (slug in ('politica-de-privacidade', 'termos-e-condicoes')),
  title text not null,
  body_md text not null,
  version integer not null default 1,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.legal_document_versions (
  id bigserial primary key,
  slug text not null references public.legal_documents(slug) on delete cascade,
  version integer not null,
  title text not null,
  body_md text not null,
  review_status text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

-- Submissões --------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  submitter_name text not null check (char_length(submitter_name) between 2 and 160),
  submitter_email citext not null,
  submitter_institution text,
  submitter_country text,
  title text not null check (char_length(title) between 2 and 500),
  material_type app.resource_type not null,
  authors_text text not null,
  abstract text not null,
  keywords text[] not null default '{}',
  file_key text,
  file_name text,
  file_size bigint,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  license_info text not null,
  authorization_confirmed boolean not null check (authorization_confirmed),
  privacy_acknowledged boolean not null check (privacy_acknowledged),
  status app.submission_status not null default 'pending',
  resource_id uuid references public.resources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_file_or_link check (file_key is not null or external_url is not null)
);
create index submissions_status_idx on public.submissions(status, created_at desc);

create table public.submission_events (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  from_status app.submission_status,
  to_status app.submission_status not null,
  note text,
  actor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index submission_events_submission_idx on public.submission_events(submission_id, created_at);

-- Histórico editorial, auditoria e estatísticas ---------------------------

create table public.editorial_events (
  id bigserial primary key,
  entity_type text not null check (entity_type in ('resource', 'session')),
  entity_id uuid not null,
  from_status app.editorial_status,
  to_status app.editorial_status not null,
  note text,
  actor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index editorial_events_entity_idx on public.editorial_events(entity_type, entity_id, created_at);

create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);
create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);

create table public.resource_stats_daily (
  resource_id uuid not null references public.resources(id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  reads integer not null default 0,
  downloads integer not null default 0,
  primary key (resource_id, day)
);
