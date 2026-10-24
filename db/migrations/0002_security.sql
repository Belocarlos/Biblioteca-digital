-- Migração 0002: contexto de sessão, regras editoriais, auditoria,
-- pesquisa, autenticação e políticas de acesso por função (RLS).
--
-- A aplicação liga-se com o papel ol4_app, que não é proprietário das
-- tabelas e por isso está sujeito a RLS. Em cada transação autenticada a
-- aplicação define app.session com o hash do token de sessão. A função do
-- papel é sempre obtida a partir da base de dados, nunca enviada pela aplicação.

-- Contexto ------------------------------------------------------------------

create or replace function app.session_context()
returns table (user_id uuid, role app.user_role)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select u.id, u.role
  from private.sessions s
  join public.users u on u.id = s.user_id
  where s.token_hash = decode(nullif(current_setting('app.session', true), ''), 'hex')
    and s.expires_at > now()
    and u.is_active
  limit 1
$$;

create or replace function app.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select (select user_id from app.session_context()) $$;

create or replace function app.current_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select coalesce((select role::text from app.session_context()), 'anon') $$;

create or replace function app.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select app.current_role() = any(roles) $$;

create or replace function app.is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select app.current_role() in ('admin', 'editor', 'reviewer') $$;

-- Utilitários ---------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger users_touch before update on public.users for each row execute function app.touch_updated_at();
create trigger authors_touch before update on public.authors for each row execute function app.touch_updated_at();
create trigger collections_touch before update on public.collections for each row execute function app.touch_updated_at();
create trigger team_touch before update on public.team_members for each row execute function app.touch_updated_at();
create trigger partners_touch before update on public.partners for each row execute function app.touch_updated_at();
create trigger submissions_touch before update on public.submissions for each row execute function app.touch_updated_at();

-- Fluxo editorial -----------------------------------------------------------
-- Rascunho -> Em revisão -> Aprovado -> Publicado -> Arquivado

create or replace function app.enforce_editorial()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  r text := app.current_role();
  uid uuid := app.current_user_id();
  allowed boolean := false;
  ignored text[] := array['status', 'updated_at', 'updated_by', 'published_at', 'archived_at'];
  content_changed boolean;
  note text := nullif(current_setting('app.editorial_note', true), '');
  entity text := case tg_table_name when 'resources' then 'resource' else 'session' end;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' and r <> 'admin' then
      raise exception 'Os novos conteúdos são criados como rascunho.' using errcode = '42501';
    end if;
    new.created_by := coalesce(new.created_by, uid);
    new.updated_by := uid;
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  content_changed := (to_jsonb(new) - ignored) is distinct from (to_jsonb(old) - ignored);

  if r = 'reviewer' and content_changed then
    raise exception 'O revisor apenas pode alterar o estado editorial.' using errcode = '42501';
  end if;

  -- Alterações de conteúdo após aprovação exigem nova revisão.
  if r = 'editor' and content_changed and old.status = 'approved' and new.status = old.status then
    new.status := 'in_review';
    note := coalesce(note, 'Conteúdo alterado após aprovação. Nova revisão necessária.');
    insert into public.editorial_events (entity_type, entity_id, from_status, to_status, note, actor_id)
    values (entity, new.id, old.status, new.status, note, uid);
  elsif new.status is distinct from old.status then
    allowed := case
      when r = 'admin' then true
      when old.status = 'draft' and new.status = 'in_review' then r = 'editor'
      when old.status = 'in_review' and new.status = 'approved' then r = 'reviewer'
      when old.status = 'in_review' and new.status = 'draft' then r in ('editor', 'reviewer')
      when old.status = 'approved' and new.status = 'published' then r = 'editor'
      when old.status = 'approved' and new.status = 'draft' then r in ('editor', 'reviewer')
      when old.status = 'published' and new.status = 'archived' then r = 'editor'
      when old.status = 'archived' and new.status = 'draft' then r = 'editor'
      else false
    end;
    if not allowed then
      raise exception 'Transição editorial não permitida (% para %).', old.status, new.status using errcode = '42501';
    end if;
    insert into public.editorial_events (entity_type, entity_id, from_status, to_status, note, actor_id)
    values (entity, new.id, old.status, new.status, note, uid);
  end if;

  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(old.published_at, now());
    new.archived_at := null;
  elsif new.status = 'archived' and old.status is distinct from 'archived' then
    new.archived_at := now();
  end if;

  if old.published_at is not null and new.slug <> old.slug then
    raise exception 'O endereço permanente não pode ser alterado depois da publicação.' using errcode = '42501';
  end if;

  new.updated_by := uid;
  new.updated_at := now();
  return new;
end $$;

create trigger resources_editorial before insert or update on public.resources
  for each row execute function app.enforce_editorial();
create trigger program_sessions_editorial before insert or update on public.program_sessions
  for each row execute function app.enforce_editorial();

-- Submissões: transições e histórico ----------------------------------------

create or replace function app.enforce_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  r text := app.current_role();
  allowed boolean;
begin
  if tg_op = 'INSERT' then
    insert into public.submission_events (submission_id, from_status, to_status, note, actor_id)
    values (new.id, null, new.status, 'Submissão recebida.', app.current_user_id());
    return null;
  end if;

  if new.status is distinct from old.status then
    allowed := case
      when r = 'admin' then true
      when old.status = 'pending' and new.status in ('under_review', 'rejected') then true
      when old.status = 'under_review' and new.status in ('accepted', 'rejected', 'pending') then true
      when old.status = 'rejected' and new.status = 'under_review' then true
      else false
    end;
    if not allowed then
      raise exception 'Transição de submissão não permitida (% para %).', old.status, new.status using errcode = '42501';
    end if;
    insert into public.submission_events (submission_id, from_status, to_status, note, actor_id)
    values (new.id, old.status, new.status, nullif(current_setting('app.editorial_note', true), ''), app.current_user_id());
  end if;
  return null;
end $$;

create trigger submissions_events after insert or update on public.submissions
  for each row execute function app.enforce_submission();

-- Utilizadores: impedir a perda do último administrador ---------------------

create or replace function app.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if (select count(*) from public.users where role = 'admin' and is_active and id <> old.id) = 0 then
      raise exception 'Tem de existir pelo menos um administrador ativo.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger users_protect_last_admin before update on public.users
  for each row execute function app.protect_last_admin();

-- Documentos jurídicos: versões e aprovação --------------------------------

create or replace function app.legal_versioning()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'UPDATE' then
    if new.body_md is distinct from old.body_md or new.title is distinct from old.title then
      new.version := old.version + 1;
      if new.review_status = old.review_status then
        new.review_status := 'pending_review';
      end if;
    end if;
    if new.review_status = 'approved' and old.review_status is distinct from 'approved'
       or (new.review_status = 'approved' and new.version <> old.version) then
      new.approved_by := app.current_user_id();
      new.approved_at := now();
    elsif new.review_status = 'pending_review' then
      new.approved_by := null;
      new.approved_at := null;
    end if;
    new.updated_by := app.current_user_id();
    new.updated_at := now();
  end if;
  return new;
end $$;

create or replace function app.legal_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  insert into public.legal_document_versions (slug, version, title, body_md, review_status, created_by)
  values (new.slug, new.version, new.title, new.body_md, new.review_status, app.current_user_id())
  on conflict (slug, version) do update
    set title = excluded.title, body_md = excluded.body_md, review_status = excluded.review_status;
  return null;
end $$;

create trigger legal_versioning before update on public.legal_documents
  for each row execute function app.legal_versioning();
create trigger legal_snapshot after insert or update on public.legal_documents
  for each row execute function app.legal_snapshot();

-- Auditoria -----------------------------------------------------------------

create or replace function app.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  rec jsonb;
  prev jsonb;
  changed text[];
  label text;
begin
  if tg_op = 'DELETE' then
    rec := to_jsonb(old);
  else
    rec := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    prev := to_jsonb(old);
    select array_agg(n.key order by n.key) into changed
    from jsonb_each(rec) n
    where n.value is distinct from (prev -> n.key)
      and n.key not in ('updated_at', 'updated_by');
    if changed is null then
      return null;
    end if;
  end if;

  label := coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'key', rec ->> 'slug');

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    app.current_user_id(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'slug', rec ->> 'key'),
    jsonb_strip_nulls(jsonb_build_object(
      'label', label,
      'changed', to_jsonb(changed),
      'status', case
        when tg_op = 'UPDATE' and (prev ->> 'status') is distinct from (rec ->> 'status')
        then jsonb_build_object('from', prev ->> 'status', 'to', rec ->> 'status')
      end
    ))
  );
  return null;
end $$;

create trigger audit_resources after insert or update or delete on public.resources for each row execute function app.audit_trigger();
create trigger audit_program_sessions after insert or update or delete on public.program_sessions for each row execute function app.audit_trigger();
create trigger audit_authors after insert or update or delete on public.authors for each row execute function app.audit_trigger();
create trigger audit_collections after insert or update or delete on public.collections for each row execute function app.audit_trigger();
create trigger audit_team after insert or update or delete on public.team_members for each row execute function app.audit_trigger();
create trigger audit_partners after insert or update or delete on public.partners for each row execute function app.audit_trigger();
create trigger audit_settings after insert or update or delete on public.site_settings for each row execute function app.audit_trigger();
create trigger audit_legal after update on public.legal_documents for each row execute function app.audit_trigger();
create trigger audit_users after insert or update or delete on public.users for each row execute function app.audit_trigger();
create trigger audit_submissions after insert or update or delete on public.submissions for each row execute function app.audit_trigger();

create or replace function app.log_action(p_action text, p_entity_type text, p_entity_id text, p_details jsonb)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (app.current_user_id(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Pesquisa ------------------------------------------------------------------

create or replace function app.refresh_resource_search(rid uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  insert into public.resource_search (resource_id, document)
  select
    r.id,
    setweight(to_tsvector('app.pt', coalesce(r.title, '') || ' ' || coalesce(r.subtitle, '')), 'A') ||
    setweight(to_tsvector('app.pt',
      array_to_string(r.keywords, ' ') || ' ' ||
      coalesce((select string_agg(a.name, ' ')
                from public.resource_authors ra
                join public.authors a on a.id = ra.author_id
                where ra.resource_id = r.id), '')), 'B') ||
    setweight(to_tsvector('app.pt', coalesce(r.abstract, '')), 'C') ||
    setweight(to_tsvector('app.pt',
      coalesce(r.knowledge_area, '') || ' ' || coalesce(r.publisher, '') || ' ' ||
      coalesce((select string_agg(c.name, ' ')
                from public.resource_collections rc
                join public.collections c on c.id = rc.collection_id
                where rc.resource_id = r.id), '')), 'D')
  from public.resources r
  where r.id = rid
  on conflict (resource_id) do update set document = excluded.document;
$$;

create or replace function app.resource_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  rid uuid;
begin
  if tg_table_name = 'resources' then
    perform app.refresh_resource_search(new.id);
  elsif tg_table_name = 'authors' then
    for rid in select resource_id from public.resource_authors where author_id = new.id loop
      perform app.refresh_resource_search(rid);
    end loop;
  elsif tg_table_name = 'collections' then
    for rid in select resource_id from public.resource_collections where collection_id = new.id loop
      perform app.refresh_resource_search(rid);
    end loop;
  else
    if tg_op = 'DELETE' then
      perform app.refresh_resource_search(old.resource_id);
    else
      perform app.refresh_resource_search(new.resource_id);
    end if;
  end if;
  return null;
end $$;

create trigger resources_search after insert or update on public.resources
  for each row execute function app.resource_search_trigger();
create trigger resource_authors_search after insert or update or delete on public.resource_authors
  for each row execute function app.resource_search_trigger();
create trigger resource_collections_search after insert or update or delete on public.resource_collections
  for each row execute function app.resource_search_trigger();
create trigger authors_search after update of name on public.authors
  for each row execute function app.resource_search_trigger();
create trigger collections_search after update of name on public.collections
  for each row execute function app.resource_search_trigger();

-- Estatísticas agregadas e anónimas ----------------------------------------

create or replace function app.track_resource_event(p_resource uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if p_kind not in ('view', 'read', 'download') then
    return;
  end if;
  if not exists (select 1 from public.resources where id = p_resource and status = 'published') then
    return;
  end if;
  insert into public.resource_stats_daily (resource_id, day, views, reads, downloads)
  values (p_resource, current_date,
          (p_kind = 'view')::int, (p_kind = 'read')::int, (p_kind = 'download')::int)
  on conflict (resource_id, day) do update set
    views = resource_stats_daily.views + excluded.views,
    reads = resource_stats_daily.reads + excluded.reads,
    downloads = resource_stats_daily.downloads + excluded.downloads;
end $$;

-- Limitação de pedidos ------------------------------------------------------

create or replace function app.rate_limit_hit(p_bucket text, p_window interval, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  n integer;
begin
  delete from private.rate_events where created_at < now() - interval '2 days';
  select count(*) into n from private.rate_events
  where bucket = p_bucket and created_at > now() - p_window;
  if n >= p_max then
    return false;
  end if;
  insert into private.rate_events (bucket) values (p_bucket);
  return true;
end $$;

-- Autenticação --------------------------------------------------------------

create or replace function app.auth_get_credentials(p_email citext)
returns table (user_id uuid, password_hash text, is_active boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select u.id, c.password_hash, u.is_active
  from public.users u
  join private.credentials c on c.user_id = u.id
  where u.email = p_email
$$;

create or replace function app.auth_recent_failures(p_email citext, p_ip_hash text, p_window interval)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select count(*)::int from private.login_attempts a
  where not a.success
    and a.created_at > now() - p_window
    and (a.email = p_email or a.ip_hash = p_ip_hash)
    and a.created_at > coalesce((
      select max(b.created_at) from private.login_attempts b
      where b.success and b.email = p_email
    ), '-infinity'::timestamptz)
$$;

create or replace function app.auth_record_attempt(p_email citext, p_ip_hash text, p_success boolean)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  delete from private.login_attempts where created_at < now() - interval '90 days';
  insert into private.login_attempts (email, ip_hash, success) values (p_email, p_ip_hash, p_success);
$$;

create or replace function app.auth_create_session(
  p_user_id uuid, p_token_hash bytea, p_ttl interval, p_ip_hash text, p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (select 1 from public.users where id = p_user_id and is_active) then
    raise exception 'Conta inativa.' using errcode = '42501';
  end if;
  delete from private.sessions where expires_at < now();
  insert into private.sessions (token_hash, user_id, expires_at, ip_hash, user_agent)
  values (p_token_hash, p_user_id, now() + p_ttl, p_ip_hash, left(p_user_agent, 300));
  update public.users set last_login_at = now() where id = p_user_id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_user_id, 'auth.login', 'users', p_user_id::text, '{}'::jsonb);
end $$;

create or replace function app.auth_session_user(p_token_hash bytea)
returns table (
  user_id uuid, email text, name text, role app.user_role,
  must_change_password boolean, expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  update private.sessions s set last_seen_at = now()
  where s.token_hash = p_token_hash and s.last_seen_at < now() - interval '5 minutes';

  return query
  select u.id, u.email::text, u.name, u.role, u.must_change_password, s.expires_at
  from private.sessions s
  join public.users u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and u.is_active;
end $$;

create or replace function app.auth_destroy_session(p_token_hash bytea)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  uid uuid;
begin
  delete from private.sessions where token_hash = p_token_hash returning user_id into uid;
  if uid is not null then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
    values (uid, 'auth.logout', 'users', uid::text, '{}'::jsonb);
  end if;
end $$;

-- Define a palavra-passe: o próprio utilizador ou um administrador.
create or replace function app.auth_set_password(p_user_id uuid, p_hash text, p_keep_token_hash bytea)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor uuid := app.current_user_id();
  is_self boolean := actor = p_user_id;
begin
  if actor is null or not (is_self or app.current_role() = 'admin') then
    raise exception 'Sem permissão para alterar esta palavra-passe.' using errcode = '42501';
  end if;
  insert into private.credentials (user_id, password_hash, updated_at)
  values (p_user_id, p_hash, now())
  on conflict (user_id) do update set password_hash = excluded.password_hash, updated_at = now();
  update public.users set must_change_password = not is_self where id = p_user_id;
  delete from private.sessions
  where user_id = p_user_id and (p_keep_token_hash is null or token_hash <> p_keep_token_hash);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (actor, case when is_self then 'auth.password_changed' else 'auth.password_reset' end,
          'users', p_user_id::text, '{}'::jsonb);
end $$;

-- Termina todas as sessões de um utilizador desativado.
create or replace function app.revoke_sessions_on_deactivate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.is_active and not new.is_active then
    delete from private.sessions where user_id = new.id;
  end if;
  return null;
end $$;

create trigger users_revoke_sessions after update on public.users
  for each row execute function app.revoke_sessions_on_deactivate();

-- Row Level Security --------------------------------------------------------

alter table public.users enable row level security;
alter table public.authors enable row level security;
alter table public.collections enable row level security;
alter table public.resources enable row level security;
alter table public.resource_search enable row level security;
alter table public.resource_authors enable row level security;
alter table public.resource_collections enable row level security;
alter table public.program_sessions enable row level security;
alter table public.session_speakers enable row level security;
alter table public.session_resources enable row level security;
alter table public.team_members enable row level security;
alter table public.partners enable row level security;
alter table public.site_settings enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_events enable row level security;
alter table public.editorial_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.resource_stats_daily enable row level security;

-- Utilizadores
create policy users_select on public.users for select
  using ((select app.is_staff()));
create policy users_insert on public.users for insert
  with check ((select app.has_role('admin')));
create policy users_update on public.users for update
  using ((select app.has_role('admin')) or id = (select app.current_user_id()))
  with check ((select app.has_role('admin')) or id = (select app.current_user_id()));

-- Impede que um utilizador sem perfil de administrador altere a própria função.
create or replace function app.protect_user_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if app.current_role() <> 'admin' and (
      new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email
      or new.must_change_password is distinct from old.must_change_password) then
    raise exception 'Apenas administradores podem alterar funções, estado ou e-mail.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger users_protect_role before update on public.users
  for each row execute function app.protect_user_role();

-- Autores
-- Os nomes de autores associados a conteúdos publicados são visíveis porque
-- fazem parte dos metadados bibliográficos. O perfil público só é apresentado
-- quando is_published é verdadeiro (verificado também na aplicação).
create policy authors_select on public.authors for select
  using (
    is_published
    or (select app.is_staff())
    or exists (select 1 from public.resource_authors ra
               join public.resources r on r.id = ra.resource_id
               where ra.author_id = authors.id and r.status = 'published')
    or exists (select 1 from public.session_speakers ss
               join public.program_sessions s on s.id = ss.session_id
               where ss.author_id = authors.id and s.status = 'published')
  );
create policy authors_insert on public.authors for insert
  with check ((select app.has_role('admin', 'editor')));
create policy authors_update on public.authors for update
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));
create policy authors_delete on public.authors for delete
  using ((select app.has_role('admin')));

-- Coleções
create policy collections_select on public.collections for select
  using (is_published or (select app.is_staff()));
create policy collections_insert on public.collections for insert
  with check ((select app.has_role('admin', 'editor')));
create policy collections_update on public.collections for update
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));
create policy collections_delete on public.collections for delete
  using ((select app.has_role('admin')));

-- Recursos
create policy resources_select on public.resources for select
  using (status = 'published' or (select app.is_staff()));
create policy resources_insert on public.resources for insert
  with check ((select app.has_role('admin', 'editor')));
create policy resources_update on public.resources for update
  using ((select app.is_staff()))
  with check ((select app.is_staff()));
create policy resources_delete on public.resources for delete
  using ((select app.has_role('admin')) or ((select app.has_role('editor')) and status = 'draft'));

create policy resource_search_select on public.resource_search for select
  using (exists (select 1 from public.resources r where r.id = resource_id));

create policy resource_authors_select on public.resource_authors for select
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy resource_authors_write on public.resource_authors for all
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));

create policy resource_collections_select on public.resource_collections for select
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy resource_collections_write on public.resource_collections for all
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));

-- Sessões
create policy program_sessions_select on public.program_sessions for select
  using (status = 'published' or (select app.is_staff()));
create policy program_sessions_insert on public.program_sessions for insert
  with check ((select app.has_role('admin', 'editor')));
create policy program_sessions_update on public.program_sessions for update
  using ((select app.is_staff()))
  with check ((select app.is_staff()));
create policy program_sessions_delete on public.program_sessions for delete
  using ((select app.has_role('admin')) or ((select app.has_role('editor')) and status = 'draft'));

create policy session_speakers_select on public.session_speakers for select
  using (exists (select 1 from public.program_sessions s where s.id = session_id));
create policy session_speakers_write on public.session_speakers for all
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));

create policy session_resources_select on public.session_resources for select
  using (exists (select 1 from public.program_sessions s where s.id = session_id)
     and exists (select 1 from public.resources r where r.id = resource_id));
create policy session_resources_write on public.session_resources for all
  using ((select app.has_role('admin', 'editor')))
  with check ((select app.has_role('admin', 'editor')));

-- Equipa e parceiros (gestão por administradores)
create policy team_select on public.team_members for select
  using (is_published or (select app.is_staff()));
create policy team_write on public.team_members for all
  using ((select app.has_role('admin')))
  with check ((select app.has_role('admin')));

create policy partners_select on public.partners for select
  using (is_published or (select app.is_staff()));
create policy partners_write on public.partners for all
  using ((select app.has_role('admin')))
  with check ((select app.has_role('admin')));

-- Configurações
create policy settings_select on public.site_settings for select using (true);
create policy settings_write on public.site_settings for all
  using ((select app.has_role('admin')))
  with check ((select app.has_role('admin')));

-- Documentos jurídicos
create policy legal_select on public.legal_documents for select using (true);
create policy legal_update on public.legal_documents for update
  using ((select app.has_role('admin')))
  with check ((select app.has_role('admin')));
create policy legal_versions_select on public.legal_document_versions for select
  using ((select app.is_staff()));

-- Submissões: o público pode submeter, apenas a equipa pode consultar.
create policy submissions_insert_public on public.submissions for insert
  with check (status = 'pending' and resource_id is null);
create policy submissions_select on public.submissions for select
  using ((select app.is_staff()));
create policy submissions_update on public.submissions for update
  using ((select app.is_staff()))
  with check ((select app.is_staff()));
create policy submissions_delete on public.submissions for delete
  using ((select app.has_role('admin')));

create policy submission_events_select on public.submission_events for select
  using ((select app.is_staff()));

-- Histórico editorial, auditoria e estatísticas
create policy editorial_events_select on public.editorial_events for select
  using ((select app.is_staff()));
create policy audit_log_select on public.audit_log for select
  using ((select app.has_role('admin')));
create policy stats_select on public.resource_stats_daily for select
  using ((select app.is_staff()));
