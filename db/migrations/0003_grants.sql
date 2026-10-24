-- Migração 0003: privilégios do papel da aplicação (ol4_app).
-- O papel é criado aqui sem LOGIN. O script de migração ativa o LOGIN e
-- define a palavra-passe a partir de APP_DB_PASSWORD, quando fornecida.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ol4_app') then
    create role ol4_app nologin noinherit nobypassrls;
  end if;
end $$;

revoke all on schema private from public;
revoke all on all tables in schema private from public;

grant usage on schema public, app to ol4_app;

grant select on all tables in schema public to ol4_app;

grant insert, update, delete on
  public.users,
  public.authors,
  public.collections,
  public.resources,
  public.resource_authors,
  public.resource_collections,
  public.program_sessions,
  public.session_speakers,
  public.session_resources,
  public.team_members,
  public.partners,
  public.site_settings,
  public.submissions
to ol4_app;

grant update on public.legal_documents to ol4_app;

-- Tabelas apenas de leitura para a aplicação: escritas exclusivamente por
-- funções e gatilhos da base de dados.
revoke insert, update, delete, truncate on
  public.audit_log,
  public.editorial_events,
  public.submission_events,
  public.resource_search,
  public.resource_stats_daily,
  public.legal_document_versions
from ol4_app;

revoke all on all functions in schema app from public;

grant execute on function
  app.unaccent_i(text),
  app.session_context(),
  app.current_user_id(),
  app.current_role(),
  app.has_role(text[]),
  app.is_staff(),
  app.log_action(text, text, text, jsonb),
  app.track_resource_event(uuid, text),
  app.rate_limit_hit(text, interval, integer),
  app.auth_get_credentials(citext),
  app.auth_recent_failures(citext, text, interval),
  app.auth_record_attempt(citext, text, boolean),
  app.auth_create_session(uuid, bytea, interval, text, text),
  app.auth_session_user(bytea),
  app.auth_destroy_session(bytea),
  app.auth_set_password(uuid, text, bytea)
to ol4_app;
