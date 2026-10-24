import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, EmptyRow, Flash, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { canEditContent } from "@/lib/workflow";

export const metadata: Metadata = { title: "Autores" };

export default async function AdminAuthorsPage({ searchParams }: PageProps<"/admin/autores">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const rows = await asUser(user, (tx) =>
    tx<{ id: string; name: string; specialization: string | null; institution: string | null; is_published: boolean; photo_key: string | null; resources: number; sessions: number }[]>`
      select a.id, a.name, a.specialization, a.institution, a.is_published, a.photo_key,
        (select count(*)::int from resource_authors where author_id = a.id) as resources,
        (select count(*)::int from session_speakers where author_id = a.id) as sessions
      from authors a
      ${q ? tx`where app.unaccent_i(a.name) ilike app.unaccent_i(${like})` : tx``}
      order by app.unaccent_i(coalesce(a.sort_name, a.name))`,
  );
  return (
    <>
      <AdminHeader
        title="Autores e oradores"
        description="Perfis das pessoas associadas aos recursos e às sessões."
        actions={
          canEditContent(user.role) ? (
            <LinkButton href="/admin/autores/novo">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo perfil
            </LinkButton>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      <form method="get" className="mb-5 flex max-w-lg gap-2" role="search">
        <label htmlFor="admin-autores-q" className="sr-only">
          Pesquisar por nome
        </label>
        <input id="admin-autores-q" name="q" type="search" defaultValue={q} placeholder="Pesquisar por nome" className="h-10 flex-1 rounded-md border border-line-strong bg-white px-3 text-sm" />
        <button type="submit" className="h-10 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
          Pesquisar
        </button>
      </form>
      <Table head={["Nome", "Especialização e instituição", "Perfil público", "Recursos", "Sessões"]}>
        {rows.length ? (
          rows.map((a) => (
            <tr key={a.id} className="hover:bg-surface/60">
              <Td>
                <Link href={`/admin/autores/${a.id}`} className="font-medium text-brand-blue hover:underline">
                  {a.name}
                </Link>
              </Td>
              <Td className="text-muted">{[a.specialization, a.institution].filter(Boolean).join(" · ")}</Td>
              <Td>{a.is_published ? <Badge tone="green">Publicado</Badge> : <Badge>Não publicado</Badge>}</Td>
              <Td className="text-muted">{a.resources}</Td>
              <Td className="text-muted">{a.sessions}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5}>{q ? "Não foram encontrados perfis." : "Ainda não existem perfis registados."}</EmptyRow>
        )}
      </Table>
    </>
  );
}
