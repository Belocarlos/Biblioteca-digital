import type { Metadata } from "next";
import Link from "next/link";
import { asUser, requireRole } from "@/lib/auth/session";
import { RESOURCE_TYPE_LABELS, SUBMISSION_STATUSES, SUBMISSION_STATUS_LABELS, type ResourceType, type SubmissionStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, EmptyRow, FilterTabs, Flash, Table, Td } from "@/components/admin/ui";
import { SubmissionBadge } from "@/components/admin/submission-badge";

export const metadata: Metadata = { title: "Submissões" };

export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissoes">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const sp = await searchParams;
  const status = SUBMISSION_STATUSES.includes(sp.estado as SubmissionStatus) ? (sp.estado as SubmissionStatus) : null;
  const { rows, counts } = await asUser(user, async (tx) => {
    const [rows, counts] = await Promise.all([
      tx<{ id: string; reference_code: string; title: string; material_type: ResourceType; submitter_name: string; submitter_institution: string | null; status: SubmissionStatus; created_at: Date; has_file: boolean }[]>`
        select id, reference_code, title, material_type, submitter_name, submitter_institution, status, created_at, file_key is not null as has_file
        from submissions ${status ? tx`where status = ${status}` : tx``}
        order by created_at desc limit 200`,
      tx<{ status: SubmissionStatus; count: number }[]>`select status, count(*)::int as count from submissions group by status`,
    ]);
    return { rows, counts: new Map(counts.map((c) => [c.status, c.count])) };
  });
  return (
    <>
      <AdminHeader title="Submissões" description="Propostas de materiais enviadas através do formulário público. Nenhuma submissão é publicada automaticamente." />
      <Flash ok={sp.ok} />
      <FilterTabs
        current={status ?? "todas"}
        items={[
          { value: "todas", label: "Todas", href: "/admin/submissoes", count: [...counts.values()].reduce((a, b) => a + b, 0) },
          ...SUBMISSION_STATUSES.map((s) => ({ value: s, label: SUBMISSION_STATUS_LABELS[s], href: `/admin/submissoes?estado=${s}`, count: counts.get(s) ?? 0 })),
        ]}
      />
      <Table head={["Referência", "Título", "Tipo", "Proponente", "Estado", "Recebida"]}>
        {rows.length ? (
          rows.map((s) => (
            <tr key={s.id} className="hover:bg-surface/60">
              <Td className="whitespace-nowrap font-mono text-xs">{s.reference_code}</Td>
              <Td className="max-w-sm">
                <Link href={`/admin/submissoes/${s.id}`} className="font-medium text-brand-blue hover:underline">
                  {s.title}
                </Link>
              </Td>
              <Td className="whitespace-nowrap text-muted">{RESOURCE_TYPE_LABELS[s.material_type]}</Td>
              <Td className="text-muted">
                {s.submitter_name}
                {s.submitter_institution ? <span className="block text-xs">{s.submitter_institution}</span> : null}
              </Td>
              <Td>
                <SubmissionBadge status={s.status} />
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(s.created_at)}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={6}>Não existem submissões{status ? " neste estado" : ""}.</EmptyRow>
        )}
      </Table>
    </>
  );
}
