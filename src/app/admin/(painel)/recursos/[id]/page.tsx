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
import { Cover } from "@/components/site/cover";
import { LIMITS, formatBytes, type EditorialStatus, type ResourceType } from "@/lib/constants";
import { allowedTransitions, canEditContent } from "@/lib/workflow";
import { UUID_RE } from "@/lib/admin-helpers";
import { formatDateTime } from "@/lib/format";
import { ResourceForm } from "../resource-form";
import { deleteResource, transitionResource, uploadResourceFile } from "../actions";

export const metadata: Metadata = { title: "Editar recurso" };

export default async function EditResourcePage({ params, searchParams }: PageProps<"/admin/recursos/[id]">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const data = await asUser(user, async (tx) => {
    const [r] = await tx<
      {
        id: string; slug: string; title: string; subtitle: string | null; resource_type: ResourceType; publication_year: number | null;
        language: string; country: string | null; knowledge_area: string | null; publisher: string | null; doi: string | null; isbn: string | null;
        abstract: string | null; keywords: string[]; license: string; license_details: string | null; rights_holder: string | null;
        external_url: string | null; file_key: string | null; file_name: string | null; file_size: number | null; cover_key: string | null;
        allow_online_reading: boolean; allow_download: boolean; status: EditorialStatus; published_at: Date | null; created_at: Date; updated_at: Date;
        created_by_name: string | null; author_ids: string[]; collection_ids: string[]; session_ids: string[];
      }[]
    >`
      select r.*, u.name as created_by_name,
        coalesce((select array_agg(author_id order by position) from resource_authors where resource_id = r.id), '{}') as author_ids,
        coalesce((select array_agg(collection_id order by position) from resource_collections where resource_id = r.id), '{}') as collection_ids,
        coalesce((select array_agg(session_id) from session_resources where resource_id = r.id), '{}') as session_ids
      from resources r left join users u on u.id = r.created_by
      where r.id = ${id}`;
    if (!r) return null;
    const [options, history, submission] = await Promise.all([
      pickerOptions(tx),
      editorialHistory(tx, "resource", id),
      tx<{ id: string; reference_code: string }[]>`select id, reference_code from submissions where resource_id = ${id} limit 1`,
    ]);
    return { r, options, history, submission: submission[0] ?? null };
  });
  if (!data) notFound();
  const { r, options, history, submission } = data;
  const canEdit = canEditContent(user.role);
  const transitions = allowedTransitions(user.role, r.status);
  const canDelete = user.role === "admin" || (user.role === "editor" && r.status === "draft");

  return (
    <>
      <AdminHeader
        title={r.title}
        back={{ href: "/admin/recursos", label: "Recursos" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span>
              Criado em {formatDateTime(r.created_at)}
              {r.created_by_name ? ` por ${r.created_by_name}` : ""} · Atualizado em {formatDateTime(r.updated_at)}
            </span>
          </span>
        }
        actions={
          r.status === "published" ? (
            <Link href={`/biblioteca/${r.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
              Ver página pública <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      {submission ? (
        <Notice tone="info" className="mb-6">
          Recurso criado a partir da submissão{" "}
          <Link href={`/admin/submissoes/${submission.id}`} className="font-medium underline">
            {submission.reference_code}
          </Link>
          . Verifique os metadados, os direitos e o ficheiro antes de enviar para revisão.
        </Notice>
      ) : null}
      {!canEdit ? (
        <Notice tone="info" className="mb-6">
          Como revisor, pode consultar os metadados e alterar o estado editorial. A edição de conteúdos está reservada a editores e administradores.
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 rounded-md border border-line bg-white p-5 sm:p-8">
          <ResourceForm
            canEdit={canEdit}
            options={options}
            values={{ ...r, published: !!r.published_at, has_file: !!r.file_key }}
          />
        </div>
        <div className="space-y-6">
          <Panel title="Fluxo editorial" description="Rascunho, Em revisão, Aprovado, Publicado">
            <WorkflowForm action={transitionResource} id={r.id} transitions={transitions} />
          </Panel>

          <Panel title="Ficheiros">
            <div className="space-y-6">
              <div>
                {r.file_key ? (
                  <p className="mb-3 text-sm">
                    <a href={`/api/admin/recursos/${r.id}/ficheiro`} target="_blank" className="link break-all">
                      {r.file_name ?? "documento.pdf"}
                    </a>
                    <span className="text-muted"> ({formatBytes(r.file_size)})</span>
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-muted">Sem ficheiro PDF.</p>
                )}
                {canEdit ? (
                  <UploadForm
                    action={uploadResourceFile}
                    id={r.id}
                    field="file"
                    accept="application/pdf,.pdf"
                    label="Ficheiro PDF"
                    help={`PDF até ${formatBytes(LIMITS.pdfAdminBytes)}. São recusados ficheiros com JavaScript, anexos ou ações automáticas.`}
                    hasFile={!!r.file_key}
                    removeLabel="Remover ficheiro"
                  />
                ) : null}
              </div>
              <div className="border-t border-line pt-5">
                <div className="mb-3 w-28">
                  <Cover coverKey={r.cover_key} title={r.title} type={r.resource_type} size="sm" />
                </div>
                {canEdit ? (
                  <UploadForm
                    action={uploadResourceFile}
                    id={r.id}
                    field="cover"
                    accept="image/jpeg,image/png,image/webp"
                    label="Capa"
                    help={`JPEG, PNG ou WebP até ${formatBytes(LIMITS.imageBytes)}. A imagem é otimizada e os metadados são removidos.`}
                    hasFile={!!r.cover_key}
                    removeLabel="Remover capa"
                  />
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel title="Histórico editorial">
            <EditorialHistory entries={history} />
          </Panel>

          {canDelete ? (
            <Panel title="Eliminar recurso">
              <DeleteForm
                action={deleteResource}
                id={r.id}
                label={r.title}
                warning={r.status === "draft" ? "O rascunho e os respetivos ficheiros serão eliminados." : "Recomenda-se arquivar em vez de eliminar. A eliminação remove o registo, os ficheiros e o endereço permanente."}
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
