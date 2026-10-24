import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Image as ImageIcon, Link2, Plus } from "lucide-react";
import { requireRole, asUser } from "@/lib/auth/session";
import { EDITORIAL_STATUSES, EDITORIAL_STATUS_LABELS, RESOURCE_TYPE_LABELS, type EditorialStatus, type ResourceType } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, EmptyRow, FilterTabs, Flash, StatusBadge, Table, Td } from "@/components/admin/ui";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/misc";
import { canEditContent } from "@/lib/workflow";

export const metadata: Metadata = { title: "Recursos" };

const PER_PAGE = 30;

export default async function AdminResourcesPage({ searchParams }: PageProps<"/admin/recursos">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const status = EDITORIAL_STATUSES.includes(sp.estado as EditorialStatus) ? (sp.estado as EditorialStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = typeof sp.pagina === "string" && /^\d{1,4}$/.test(sp.pagina) ? Number(sp.pagina) : 1;
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  const { rows, total, counts } = await asUser(user, async (tx) => {
    const where = tx`
      true
      ${status ? tx`and r.status = ${status}` : tx``}
      ${q ? tx`and (app.unaccent_i(r.title) ilike app.unaccent_i(${like}) or exists (select 1 from resource_authors ra join authors a on a.id = ra.author_id where ra.resource_id = r.id and app.unaccent_i(a.name) ilike app.unaccent_i(${like})))` : tx``}`;
    const [rows, [{ total }], counts] = await Promise.all([
      tx<{ id: string; title: string; resource_type: ResourceType; publication_year: number | null; status: EditorialStatus; updated_at: Date; file_key: string | null; cover_key: string | null; external_url: string | null; authors: string | null }[]>`
        select r.id, r.title, r.resource_type, r.publication_year, r.status, r.updated_at, r.file_key, r.cover_key, r.external_url,
          (select string_agg(a.name, '; ' order by ra.position) from resource_authors ra join authors a on a.id = ra.author_id where ra.resource_id = r.id) as authors
        from resources r where ${where}
        order by r.updated_at desc
        limit ${PER_PAGE} offset ${(page - 1) * PER_PAGE}`,
      tx<{ total: number }[]>`select count(*)::int as total from resources r where ${where}`,
      tx<{ status: EditorialStatus; count: number }[]>`select status, count(*)::int as count from resources group by status`,
    ]);
    return { rows, total, counts: new Map(counts.map((c) => [c.status, c.count])) };
  });

  const qs = (s: string | null) => `/admin/recursos?${new URLSearchParams({ ...(s ? { estado: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <AdminHeader
        title="Recursos"
        description="Livros, artigos, apresentações, relatórios e restantes materiais da biblioteca."
        actions={
          canEditContent(user.role) ? (
            <LinkButton href="/admin/recursos/novo">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo recurso
            </LinkButton>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      <FilterTabs
        current={status ?? "todos"}
        items={[
          { value: "todos", label: "Todos", href: qs(null), count: [...counts.values()].reduce((a, b) => a + b, 0) },
          ...EDITORIAL_STATUSES.map((s) => ({ value: s, label: EDITORIAL_STATUS_LABELS[s], href: qs(s), count: counts.get(s) ?? 0 })),
        ]}
      />
      <form method="get" className="mb-5 flex max-w-lg gap-2" role="search">
        {status ? <input type="hidden" name="estado" value={status} /> : null}
        <label htmlFor="admin-q" className="sr-only">
          Pesquisar por título ou autor
        </label>
        <input id="admin-q" name="q" type="search" defaultValue={q} placeholder="Pesquisar por título ou autor" className="h-10 flex-1 rounded-md border border-line-strong bg-white px-3 text-sm" />
        <button type="submit" className="h-10 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
          Pesquisar
        </button>
      </form>
      <Table head={["Título", "Tipo", "Ano", "Estado", "Conteúdos", "Atualizado"]}>
        {rows.length ? (
          rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface/60">
              <Td className="max-w-md">
                <Link href={`/admin/recursos/${r.id}`} className="font-medium text-brand-blue hover:underline">
                  {r.title}
                </Link>
                {r.authors ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{r.authors}</p> : null}
              </Td>
              <Td className="whitespace-nowrap text-muted">{RESOURCE_TYPE_LABELS[r.resource_type]}</Td>
              <Td className="text-muted">{r.publication_year ?? ""}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td>
                <span className="flex gap-2 text-muted">
                  {r.file_key ? <FileText aria-label="Tem ficheiro PDF" className="h-4 w-4" /> : null}
                  {r.cover_key ? <ImageIcon aria-label="Tem capa" className="h-4 w-4" /> : null}
                  {r.external_url ? <Link2 aria-label="Tem fonte externa" className="h-4 w-4" /> : null}
                </span>
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(r.updated_at)}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={6}>{q || status ? "Não foram encontrados recursos para os critérios selecionados." : "Ainda não existem recursos. Crie o primeiro recurso para iniciar o acervo."}</EmptyRow>
        )}
      </Table>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PER_PAGE))} hrefFor={(p) => `${qs(status)}&pagina=${p}`} />
    </>
  );
}
