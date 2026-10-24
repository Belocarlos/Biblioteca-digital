import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { EDITORIAL_STATUSES, EDITORIAL_STATUS_LABELS, type EditorialStatus, type SubmissionStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, Flash, Panel, StatusBadge } from "@/components/admin/ui";
import { SubmissionBadge } from "@/components/admin/submission-badge";
import { LinkButton } from "@/components/ui/button";
import { canEditContent } from "@/lib/workflow";

export const metadata: Metadata = { title: "Visão geral" };

export default async function OverviewPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const data = await asUser(user, async (tx) => {
    const [resourceCounts, sessionCounts, other, todo, submissions, events] = await Promise.all([
      tx<{ status: EditorialStatus; count: number }[]>`select status, count(*)::int as count from resources group by status`,
      tx<{ status: EditorialStatus; count: number }[]>`select status, count(*)::int as count from program_sessions group by status`,
      tx<{ authors: number; authors_published: number; pending: number }[]>`
        select (select count(*)::int from authors) as authors, (select count(*)::int from authors where is_published) as authors_published,
               (select count(*)::int from submissions where status in ('pending', 'under_review')) as pending`,
      tx<{ id: string; title: string; status: EditorialStatus; kind: string; updated_at: Date }[]>`
        select id, title, status, 'recursos' as kind, updated_at from resources
        where status = any(${user.role === "reviewer" ? ["in_review"] : user.role === "editor" ? ["approved", "draft"] : ["in_review", "approved"]}::app.editorial_status[])
        union all
        select id, title, status, 'sessoes' as kind, updated_at from program_sessions
        where status = any(${user.role === "reviewer" ? ["in_review"] : user.role === "editor" ? ["approved", "draft"] : ["in_review", "approved"]}::app.editorial_status[])
        order by updated_at desc limit 10`,
      tx<{ id: string; reference_code: string; title: string; status: SubmissionStatus; created_at: Date }[]>`
        select id, reference_code, title, status, created_at from submissions where status in ('pending', 'under_review') order by created_at desc limit 6`,
      tx<{ id: number; entity_type: string; entity_id: string; to_status: EditorialStatus; created_at: Date; actor: string | null; title: string | null }[]>`
        select e.id, e.entity_type, e.entity_id, e.to_status, e.created_at, u.name as actor,
          coalesce((select title from resources where id = e.entity_id), (select title from program_sessions where id = e.entity_id)) as title
        from editorial_events e left join users u on u.id = e.actor_id
        order by e.created_at desc limit 8`,
    ]);
    return {
      resources: new Map(resourceCounts.map((r) => [r.status, r.count])),
      sessions: new Map(sessionCounts.map((r) => [r.status, r.count])),
      other: other[0]!,
      todo,
      submissions,
      events,
    };
  });

  const todoTitle = user.role === "reviewer" ? "A aguardar revisão" : user.role === "editor" ? "Rascunhos e conteúdos aprovados" : "Em revisão e prontos a publicar";

  return (
    <>
      <AdminHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="Resumo da atividade editorial da biblioteca."
        actions={
          canEditContent(user.role) ? (
            <>
              <LinkButton href="/admin/recursos/novo">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Novo recurso
              </LinkButton>
              <LinkButton href="/admin/sessoes/novo" variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nova sessão
              </LinkButton>
            </>
          ) : null
        }
      />
      <Flash ok={sp.ok} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Recursos">
          <dl className="space-y-2 text-sm">
            {EDITORIAL_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <dt>
                  <Link href={`/admin/recursos?estado=${s}`} className="hover:text-brand-blue hover:underline">
                    {EDITORIAL_STATUS_LABELS[s]}
                  </Link>
                </dt>
                <dd className="font-semibold tabular-nums">{data.resources.get(s) ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Sessões">
          <dl className="space-y-2 text-sm">
            {EDITORIAL_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <dt>
                  <Link href={`/admin/sessoes?estado=${s}`} className="hover:text-brand-blue hover:underline">
                    {EDITORIAL_STATUS_LABELS[s]}
                  </Link>
                </dt>
                <dd className="font-semibold tabular-nums">{data.sessions.get(s) ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Autores e submissões">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Perfis registados</dt>
              <dd className="font-semibold tabular-nums">{data.other.authors}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Perfis publicados</dt>
              <dd className="font-semibold tabular-nums">{data.other.authors_published}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                <Link href="/admin/submissoes" className="hover:text-brand-blue hover:underline">
                  Submissões por analisar
                </Link>
              </dt>
              <dd className="font-semibold tabular-nums">{data.other.pending}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title={todoTitle} className="lg:col-span-2">
          {data.todo.length ? (
            <ul className="divide-y divide-line">
              {data.todo.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/admin/${t.kind}/${t.id}`} className="font-medium text-brand-blue hover:underline">
                    {t.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted">{t.kind === "recursos" ? "Recurso" : "Sessão"}</span>
                    <StatusBadge status={t.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Não existem conteúdos a aguardar a sua ação.</p>
          )}
        </Panel>

        <Panel title="Submissões recentes">
          {data.submissions.length ? (
            <ul className="space-y-3">
              {data.submissions.map((s) => (
                <li key={s.id} className="text-sm">
                  <Link href={`/admin/submissoes/${s.id}`} className="font-medium text-brand-blue hover:underline">
                    {s.title}
                  </Link>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <SubmissionBadge status={s.status} /> {formatDateTime(s.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sem submissões por analisar.</p>
          )}
        </Panel>

        <Panel title="Atividade editorial recente" className="lg:col-span-3">
          {data.events.length ? (
            <ul className="divide-y divide-line">
              {data.events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span>
                    <Link href={`/admin/${e.entity_type === "resource" ? "recursos" : "sessoes"}/${e.entity_id}`} className="font-medium text-brand-blue hover:underline">
                      {e.title ?? "Registo eliminado"}
                    </Link>
                    <span className="text-muted"> passou a </span>
                    <StatusBadge status={e.to_status} />
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateTime(e.created_at)}
                    {e.actor ? ` · ${e.actor}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ainda não existe atividade editorial.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
