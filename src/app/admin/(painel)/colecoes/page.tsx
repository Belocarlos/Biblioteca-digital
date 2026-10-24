import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, EmptyRow, Flash, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { canEditContent } from "@/lib/workflow";
import { moveCollection } from "./actions";

export const metadata: Metadata = { title: "Coleções" };

export default async function AdminCollectionsPage({ searchParams }: PageProps<"/admin/colecoes">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const rows = await asUser(user, (tx) =>
    tx<{ id: string; name: string; slug: string; is_published: boolean; total: number; published: number }[]>`
      select c.id, c.name, c.slug, c.is_published,
        (select count(*)::int from resource_collections where collection_id = c.id) as total,
        (select count(*)::int from resource_collections rc join resources r on r.id = rc.resource_id where rc.collection_id = c.id and r.status = 'published') as published
      from collections c order by c.position, c.name`,
  );
  const canEdit = canEditContent(user.role);
  return (
    <>
      <AdminHeader
        title="Coleções temáticas"
        description="A ordem definida aqui é a ordem apresentada no website."
        actions={
          canEdit ? (
            <LinkButton href="/admin/colecoes/nova">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nova coleção
            </LinkButton>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      <Table head={["Ordem", "Coleção", "Visibilidade", "Recursos publicados", "Total de recursos"]}>
        {rows.length ? (
          rows.map((c, i) => (
            <tr key={c.id} className="hover:bg-surface/60">
              <Td>
                {canEdit ? (
                  <div className="flex gap-1">
                    <form action={moveCollection}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={i === 0} className="rounded p-1 text-brand-blue hover:bg-brand-blue-50 disabled:opacity-30" aria-label={`Subir ${c.name}`}>
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={moveCollection}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={i === rows.length - 1} className="rounded p-1 text-brand-blue hover:bg-brand-blue-50 disabled:opacity-30" aria-label={`Descer ${c.name}`}>
                        <ArrowDown aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <span className="text-muted">{i + 1}</span>
                )}
              </Td>
              <Td>
                <Link href={`/admin/colecoes/${c.id}`} className="font-medium text-brand-blue hover:underline">
                  {c.name}
                </Link>
              </Td>
              <Td>{c.is_published ? <Badge tone="green">Visível</Badge> : <Badge>Oculta</Badge>}</Td>
              <Td className="text-muted">{c.published}</Td>
              <Td className="text-muted">{c.total}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5}>Ainda não existem coleções.</EmptyRow>
        )}
      </Table>
    </>
  );
}
