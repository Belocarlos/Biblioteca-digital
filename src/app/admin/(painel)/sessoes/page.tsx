import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { EDITORIAL_STATUSES, EDITORIAL_STATUS_LABELS, EVENT_STATUS_LABELS, type EditorialStatus, type EventStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, EmptyRow, FilterTabs, Flash, StatusBadge, Table, Td } from "@/components/admin/ui";
import { LinkButton } from "@/components/ui/button";
import { canEditContent } from "@/lib/workflow";

export const metadata: Metadata = { title: "Sessões" };

export default async function AdminSessionsPage({ searchParams }: PageProps<"/admin/sessoes">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const status = EDITORIAL_STATUSES.includes(sp.estado as EditorialStatus) ? (sp.estado as EditorialStatus) : null;
  const { rows, counts } = await asUser(user, async (tx) => {
    const [rows, counts] = await Promise.all([
      tx<{ id: string; title: string; starts_at: Date | null; timezone: string; event_status: EventStatus; status: EditorialStatus; speakers: string | null; resources: number }[]>`
        select s.id, s.title, s.starts_at, s.timezone, s.event_status, s.status,
          (select string_agg(a.name, ', ' order by ss.position) from session_speakers ss join authors a on a.id = ss.author_id where ss.session_id = s.id) as speakers,
          (select count(*)::int from session_resources where session_id = s.id) as resources
        from program_sessions s
        ${status ? tx`where s.status = ${status}` : tx``}
        order by s.starts_at desc nulls first, s.created_at desc`,
      tx<{ status: EditorialStatus; count: number }[]>`select status, count(*)::int as count from program_sessions group by status`,
    ]);
    return { rows, counts: new Map(counts.map((c) => [c.status, c.count])) };
  });

  return (
    <>
      <AdminHeader
        title="Sessões Saberes em Rede"
        description="Arquivo das sessões do programa. Publique apenas informação verificada e autorizada."
        actions={
          canEditContent(user.role) ? (
            <LinkButton href="/admin/sessoes/novo">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nova sessão
            </LinkButton>
          ) : null
        }
      />
      <Flash ok={sp.ok} />
      <FilterTabs
        current={status ?? "todos"}
        items={[
          { value: "todos", label: "Todas", href: "/admin/sessoes", count: [...counts.values()].reduce((a, b) => a + b, 0) },
          ...EDITORIAL_STATUSES.map((s) => ({ value: s, label: EDITORIAL_STATUS_LABELS[s], href: `/admin/sessoes?estado=${s}`, count: counts.get(s) ?? 0 })),
        ]}
      />
      <Table head={["Tema", "Data", "Oradores", "Sessão", "Estado editorial", "Recursos"]}>
        {rows.length ? (
          rows.map((s) => (
            <tr key={s.id} className="hover:bg-surface/60">
              <Td className="max-w-sm">
                <Link href={`/admin/sessoes/${s.id}`} className="font-medium text-brand-blue hover:underline">
                  {s.title}
                </Link>
              </Td>
              <Td className="whitespace-nowrap text-muted">{s.starts_at ? formatDateTime(s.starts_at, s.timezone) : "A confirmar"}</Td>
              <Td className="text-muted">{s.speakers ?? ""}</Td>
              <Td className="text-muted">{EVENT_STATUS_LABELS[s.event_status]}</Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td className="text-muted">{s.resources}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={6}>Ainda não existem sessões registadas.</EmptyRow>
        )}
      </Table>
    </>
  );
}
