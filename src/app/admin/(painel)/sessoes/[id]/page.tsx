import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { editorialHistory, pickerOptions } from "@/lib/queries/admin";
import { AdminHeader, Flash, Panel, StatusBadge } from "@/components/admin/ui";
import { DeleteForm, UploadForm, WorkflowForm } from "@/components/admin/forms";
import { EditorialHistory } from "@/components/admin/history";
import { Notice } from "@/components/ui/misc";
import { mediaUrl } from "@/components/site/media";
import { LIMITS, formatBytes, type EditorialStatus } from "@/lib/constants";
import { allowedTransitions, canEditContent } from "@/lib/workflow";
import { UUID_RE } from "@/lib/admin-helpers";
import { formatDateTime, utcToZonedLocal } from "@/lib/format";
import { SessionForm } from "../session-form";
import { deleteSession, transitionSession, uploadPoster } from "../actions";

export const metadata: Metadata = { title: "Editar sessão" };

export default async function EditSessionPage({ params, searchParams }: PageProps<"/admin/sessoes/[id]">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const data = await asUser(user, async (tx) => {
    const [s] = await tx<
      {
        id: string; slug: string; title: string; summary: string | null; description: string | null; starts_at: Date | null; ends_at: Date | null;
        timezone: string; format: string | null; topics: string[]; references_text: string | null; poster_key: string | null; poster_alt: string | null;
        recording_url: string | null; recording_authorized: boolean; event_status: string; status: EditorialStatus; published_at: Date | null; updated_at: Date;
        speakers: { id: string; role: string }[]; resources: { id: string; role: string }[];
      }[]
    >`
      select s.*,
        coalesce((select json_agg(json_build_object('id', author_id, 'role', role) order by position) from session_speakers where session_id = s.id), '[]') as speakers,
        coalesce((select json_agg(json_build_object('id', resource_id, 'role', relation) order by position) from session_resources where session_id = s.id), '[]') as resources
      from program_sessions s where s.id = ${id}`;
    if (!s) return null;
    const [options, history] = await Promise.all([pickerOptions(tx), editorialHistory(tx, "session", id)]);
    return { s, options, history };
  });
  if (!data) notFound();
  const { s, options, history } = data;
  const canEdit = canEditContent(user.role);
  const canDelete = user.role === "admin" || (user.role === "editor" && s.status === "draft");
  const poster = mediaUrl(s.poster_key);

  return (
    <>
      <AdminHeader
        title={s.title}
        back={{ href: "/admin/sessoes", label: "Sessões" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} /> Atualizada em {formatDateTime(s.updated_at)}
          </span>
        }
        actions={
          s.status === "published" ? (
            <Link href={`/sessoes/${s.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
              Ver página pública <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      {!canEdit ? (
        <Notice tone="info" className="mb-6">
          Como revisor, pode consultar a sessão e alterar o estado editorial.
        </Notice>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 rounded-md border border-line bg-white p-5 sm:p-8">
          <SessionForm
            canEdit={canEdit}
            options={options}
            values={{
              ...s,
              starts_local: utcToZonedLocal(s.starts_at, s.timezone),
              ends_local: utcToZonedLocal(s.ends_at, s.timezone),
              published: !!s.published_at,
            }}
          />
        </div>
        <div className="space-y-6">
          <Panel title="Fluxo editorial">
            <WorkflowForm action={transitionSession} id={s.id} transitions={allowedTransitions(user.role, s.status)} />
          </Panel>
          <Panel title="Cartaz oficial">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={s.poster_alt ?? "Cartaz da sessão"} className="mb-4 w-40 rounded-sm border border-line" />
            ) : (
              <p className="mb-4 text-sm text-muted">Sem cartaz.</p>
            )}
            {canEdit ? (
              <UploadForm
                action={uploadPoster}
                id={s.id}
                field="poster"
                accept="image/jpeg,image/png,image/webp"
                label="Imagem do cartaz"
                help={`JPEG, PNG ou WebP até ${formatBytes(LIMITS.imageBytes)}.`}
                hasFile={!!s.poster_key}
                removeLabel="Remover cartaz"
              />
            ) : null}
          </Panel>
          <Panel title="Histórico editorial">
            <EditorialHistory entries={history} />
          </Panel>
          {canDelete ? (
            <Panel title="Eliminar sessão">
              <DeleteForm action={deleteSession} id={s.id} label={s.title} warning="A sessão e o cartaz serão eliminados. Os recursos associados são mantidos." />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
