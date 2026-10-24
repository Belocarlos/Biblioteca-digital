import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Flash, Panel } from "@/components/admin/ui";
import { DeleteForm, UploadForm } from "@/components/admin/forms";
import { AuthorPhoto } from "@/components/site/author-card";
import { Checkbox } from "@/components/ui/form";
import { UUID_RE } from "@/lib/admin-helpers";
import { LIMITS, formatBytes } from "@/lib/constants";
import { canEditContent } from "@/lib/workflow";
import { AuthorForm } from "../author-form";
import { deleteAuthor, uploadAuthorPhoto } from "../actions";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function EditAuthorPage({ params, searchParams }: PageProps<"/admin/autores/[id]">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const data = await asUser(user, async (tx) => {
    const [a] = await tx<
      { id: string; slug: string; name: string; sort_name: string | null; specialization: string | null; country: string | null; institution: string | null; bio: string | null; photo_key: string | null; photo_alt: string | null; photo_authorized: boolean; links: { label: string; url: string }[]; is_published: boolean }[]
    >`select * from authors where id = ${id}`;
    if (!a) return null;
    const [resources, sessions] = await Promise.all([
      tx<{ id: string; title: string }[]>`select r.id, r.title from resource_authors ra join resources r on r.id = ra.resource_id where ra.author_id = ${id} order by r.title`,
      tx<{ id: string; title: string }[]>`select s.id, s.title from session_speakers ss join program_sessions s on s.id = ss.session_id where ss.author_id = ${id} order by s.starts_at desc nulls last`,
    ]);
    return { a, resources, sessions };
  });
  if (!data) notFound();
  const { a, resources, sessions } = data;
  const canEdit = canEditContent(user.role);

  return (
    <>
      <AdminHeader
        title={a.name}
        back={{ href: "/admin/autores", label: "Autores" }}
        actions={
          a.is_published ? (
            <Link href={`/autores/${a.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
              Ver perfil público <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="rounded-md border border-line bg-white p-5 sm:p-8">
          <AuthorForm canEdit={canEdit} values={a} />
        </div>
        <div className="space-y-6">
          <Panel title="Fotografia">
            <AuthorPhoto photoKey={a.photo_key} alt={a.photo_alt ?? a.name} className="mb-4 h-28 w-28" />
            {canEdit ? (
              <UploadForm
                action={uploadAuthorPhoto}
                id={a.id}
                field="photo"
                accept="image/jpeg,image/png,image/webp"
                label="Fotografia real autorizada"
                help={`JPEG, PNG ou WebP até ${formatBytes(LIMITS.imageBytes)}. Não utilize imagens geradas por inteligência artificial.`}
                hasFile={!!a.photo_key}
                removeLabel="Remover fotografia"
                extra={<Checkbox id="upload-photo-authorized" name="photo_authorized" label="A pessoa retratada autorizou a utilização desta fotografia." />}
              />
            ) : null}
          </Panel>
          <Panel title="Associações">
            <h3 className="text-sm font-semibold">Recursos ({resources.length})</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {resources.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/recursos/${r.id}`} className="link">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold">Sessões ({sessions.length})</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/sessoes/${s.id}`} className="link">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          {user.role === "admin" ? (
            <Panel title="Eliminar perfil">
              <DeleteForm action={deleteAuthor} id={a.id} label={a.name} warning="Só é possível eliminar perfis sem recursos nem sessões associados." />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
