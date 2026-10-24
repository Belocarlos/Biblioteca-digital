import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Flash, Panel } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/forms";
import { SubmissionBadge } from "@/components/admin/submission-badge";
import { MetaList } from "@/components/ui/misc";
import { RESOURCE_TYPE_LABELS, SUBMISSION_STATUS_LABELS, formatBytes, type ResourceType, type SubmissionStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { paragraphs } from "@/lib/markdown";
import { UUID_RE } from "@/lib/admin-helpers";
import { ConvertForm, SubmissionStatusForm } from "../submission-forms";
import { deleteSubmission } from "../actions";

export const metadata: Metadata = { title: "Submissão" };

export default async function SubmissionPage({ params, searchParams }: PageProps<"/admin/submissoes/[id]">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const data = await asUser(user, async (tx) => {
    const [s] = await tx<
      { id: string; reference_code: string; submitter_name: string; submitter_email: string; submitter_institution: string | null; submitter_country: string | null; title: string; material_type: ResourceType; authors_text: string; abstract: string; keywords: string[]; file_key: string | null; file_name: string | null; file_size: number | null; external_url: string | null; license_info: string; status: SubmissionStatus; resource_id: string | null; created_at: Date }[]
    >`select * from submissions where id = ${id}`;
    if (!s) return null;
    const events = await tx<{ id: number; from_status: SubmissionStatus | null; to_status: SubmissionStatus; note: string | null; created_at: Date; actor: string | null }[]>`
      select e.id, e.from_status, e.to_status, e.note, e.created_at, u.name as actor
      from submission_events e left join users u on u.id = e.actor_id
      where e.submission_id = ${id} order by e.created_at desc`;
    return { s, events };
  });
  if (!data) notFound();
  const { s, events } = data;
  const mailto = `mailto:${s.submitter_email}?subject=${encodeURIComponent(`Biblioteca Digital Open Lecture4All: submissão ${s.reference_code}`)}`;

  return (
    <>
      <AdminHeader
        title={s.title}
        back={{ href: "/admin/submissoes", label: "Submissões" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{s.reference_code}</span> <SubmissionBadge status={s.status} /> Recebida em {formatDateTime(s.created_at)}
          </span>
        }
      />
      <Flash ok={sp.ok} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Documento proposto">
            <MetaList
              items={[
                { label: "Título", value: s.title },
                { label: "Tipo de material", value: RESOURCE_TYPE_LABELS[s.material_type] },
                { label: "Autores", value: s.authors_text },
                { label: "Palavras-chave", value: s.keywords.join(", ") },
                {
                  label: "Ficheiro",
                  value: s.file_key ? (
                    <a href={`/api/admin/submissoes/${s.id}/ficheiro`} className="link inline-flex items-center gap-1.5">
                      <Download aria-hidden="true" className="h-4 w-4" /> {s.file_name} ({formatBytes(s.file_size)})
                    </a>
                  ) : null,
                },
                {
                  label: "Link oficial",
                  value: s.external_url ? (
                    <a href={s.external_url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 break-all">
                      {s.external_url} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : null,
                },
                { label: "Licença e direitos", value: s.license_info },
                { label: "Declarações", value: "Autorização para disponibilização confirmada; Política de Privacidade tomada em conhecimento." },
              ]}
            />
            <h3 className="mt-6 text-sm font-semibold text-ink-strong">Resumo</h3>
            <div className="mt-2 space-y-2 text-sm leading-relaxed">
              {paragraphs(s.abstract).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Panel>
          <Panel title="Proponente">
            <MetaList
              items={[
                { label: "Nome", value: s.submitter_name },
                { label: "E-mail", value: <a href={mailto} className="link">{s.submitter_email}</a> },
                { label: "Instituição", value: s.submitter_institution },
                { label: "País", value: s.submitter_country },
              ]}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Revisão">
            <SubmissionStatusForm id={s.id} status={s.status} isAdmin={user.role === "admin"} />
          </Panel>
          {s.resource_id ? (
            <Panel title="Recurso associado">
              <Link href={`/admin/recursos/${s.resource_id}`} className="link text-sm">
                Abrir o recurso criado a partir desta submissão
              </Link>
            </Panel>
          ) : ["under_review", "accepted"].includes(s.status) && user.role !== "reviewer" ? (
            <Panel title="Preparar publicação">
              <ConvertForm id={s.id} />
            </Panel>
          ) : null}
          <Panel title="Histórico de revisão">
            <ol className="space-y-4">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3 text-sm">
                  <p className="font-medium text-ink-strong">
                    {e.from_status ? `${SUBMISSION_STATUS_LABELS[e.from_status]} para ` : ""}
                    {SUBMISSION_STATUS_LABELS[e.to_status]}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(e.created_at)}
                    {e.actor ? ` · ${e.actor}` : " · Formulário público"}
                  </p>
                  {e.note ? <p className="mt-1 text-ink">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </Panel>
          {user.role === "admin" ? (
            <Panel title="Eliminar submissão">
              <DeleteForm action={deleteSubmission} id={s.id} label={s.reference_code} warning="Elimina os dados pessoais e o ficheiro submetido, por exemplo, a pedido do titular ou no fim do prazo de conservação." />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
