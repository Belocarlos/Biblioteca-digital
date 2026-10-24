import type { Metadata } from "next";
import Link from "next/link";
import { asUser, requireRole } from "@/lib/auth/session";
import { RESOURCE_TYPE_LABELS, SUBMISSION_STATUS_LABELS, languageLabel, type ResourceType, type SubmissionStatus } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { AdminHeader, EmptyRow, Panel, Table, Td } from "@/components/admin/ui";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Estatísticas" };

export default async function StatsPage() {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const d = await asUser(user, async (tx) => {
    const [byType, byCollection, byLanguage, usage, top30, topAll, submissions, monthly] = await Promise.all([
      tx<{ type: ResourceType; count: number }[]>`select resource_type as type, count(*)::int as count from resources where status = 'published' group by 1 order by 2 desc`,
      tx<{ name: string; count: number }[]>`
        select c.name, count(r.id)::int as count from collections c
        left join resource_collections rc on rc.collection_id = c.id
        left join resources r on r.id = rc.resource_id and r.status = 'published'
        group by c.id order by c.position`,
      tx<{ language: string; count: number }[]>`select language, count(*)::int as count from resources where status = 'published' group by 1 order by 2 desc`,
      tx<{ period: string; views: number; reads: number; downloads: number }[]>`
        select '30' as period, coalesce(sum(views), 0)::int as views, coalesce(sum(reads), 0)::int as reads, coalesce(sum(downloads), 0)::int as downloads
        from resource_stats_daily where day > current_date - 30
        union all
        select 'all', coalesce(sum(views), 0)::int, coalesce(sum(reads), 0)::int, coalesce(sum(downloads), 0)::int from resource_stats_daily`,
      tx<{ id: string; title: string; views: number; reads: number; downloads: number }[]>`
        select r.id, r.title, sum(s.views)::int as views, sum(s.reads)::int as reads, sum(s.downloads)::int as downloads
        from resource_stats_daily s join resources r on r.id = s.resource_id
        where s.day > current_date - 30 group by r.id order by views desc, downloads desc limit 10`,
      tx<{ id: string; title: string; views: number; reads: number; downloads: number }[]>`
        select r.id, r.title, sum(s.views)::int as views, sum(s.reads)::int as reads, sum(s.downloads)::int as downloads
        from resource_stats_daily s join resources r on r.id = s.resource_id
        group by r.id order by views desc, downloads desc limit 10`,
      tx<{ status: SubmissionStatus; count: number }[]>`select status, count(*)::int as count from submissions group by 1`,
      tx<{ month: string; count: number }[]>`
        select to_char(date_trunc('month', published_at), 'MM/YYYY') as month, count(*)::int as count
        from resources where published_at is not null and published_at > now() - interval '12 months'
        group by date_trunc('month', published_at) order by date_trunc('month', published_at) desc`,
    ]);
    return { byType, byCollection, byLanguage, usage, top30, topAll, submissions, monthly };
  });
  const u30 = d.usage.find((u) => u.period === "30");
  const uAll = d.usage.find((u) => u.period === "all");

  const usageTable = (rows: typeof d.top30) => (
    <Table head={["Recurso", "Visualizações", "Leituras online", "Descarregamentos"]}>
      {rows.length ? (
        rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <Link href={`/admin/recursos/${r.id}`} className="text-brand-blue hover:underline">
                {r.title}
              </Link>
            </Td>
            <Td className="tabular-nums">{formatNumber(r.views)}</Td>
            <Td className="tabular-nums">{formatNumber(r.reads)}</Td>
            <Td className="tabular-nums">{formatNumber(r.downloads)}</Td>
          </tr>
        ))
      ) : (
        <EmptyRow colSpan={4}>Ainda não existem dados de utilização.</EmptyRow>
      )}
    </Table>
  );

  return (
    <>
      <AdminHeader title="Estatísticas" description="Indicadores calculados a partir da base de dados." />
      <Notice tone="info" className="mb-6 max-w-4xl">
        As contagens de utilização são agregadas por dia e por recurso, sem cookies, sem endereços IP e sem qualquer dado pessoal. Incluem apenas recursos publicados.
      </Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Utilização do acervo">
          <Table head={["Período", "Visualizações", "Leituras online", "Descarregamentos"]}>
            <tr>
              <Td>Últimos 30 dias</Td>
              <Td className="tabular-nums">{formatNumber(u30?.views ?? 0)}</Td>
              <Td className="tabular-nums">{formatNumber(u30?.reads ?? 0)}</Td>
              <Td className="tabular-nums">{formatNumber(u30?.downloads ?? 0)}</Td>
            </tr>
            <tr>
              <Td>Desde o início</Td>
              <Td className="tabular-nums">{formatNumber(uAll?.views ?? 0)}</Td>
              <Td className="tabular-nums">{formatNumber(uAll?.reads ?? 0)}</Td>
              <Td className="tabular-nums">{formatNumber(uAll?.downloads ?? 0)}</Td>
            </tr>
          </Table>
        </Panel>
        <Panel title="Submissões por estado">
          <Table head={["Estado", "Número"]}>
            {(["pending", "under_review", "accepted", "rejected"] as SubmissionStatus[]).map((s) => (
              <tr key={s}>
                <Td>{SUBMISSION_STATUS_LABELS[s]}</Td>
                <Td className="tabular-nums">{d.submissions.find((x) => x.status === s)?.count ?? 0}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Recursos mais consultados (30 dias)" className="lg:col-span-2">
          {usageTable(d.top30)}
        </Panel>
        <Panel title="Recursos mais consultados (desde o início)" className="lg:col-span-2">
          {usageTable(d.topAll)}
        </Panel>
        <Panel title="Recursos publicados por tipo">
          <Table head={["Tipo", "Recursos"]}>
            {d.byType.length ? d.byType.map((r) => (
              <tr key={r.type}>
                <Td>{RESOURCE_TYPE_LABELS[r.type]}</Td>
                <Td className="tabular-nums">{r.count}</Td>
              </tr>
            )) : <EmptyRow colSpan={2}>Sem recursos publicados.</EmptyRow>}
          </Table>
        </Panel>
        <Panel title="Recursos publicados por coleção">
          <Table head={["Coleção", "Recursos"]}>
            {d.byCollection.map((r) => (
              <tr key={r.name}>
                <Td>{r.name}</Td>
                <Td className="tabular-nums">{r.count}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Recursos publicados por idioma">
          <Table head={["Idioma", "Recursos"]}>
            {d.byLanguage.length ? d.byLanguage.map((r) => (
              <tr key={r.language}>
                <Td>{languageLabel(r.language)}</Td>
                <Td className="tabular-nums">{r.count}</Td>
              </tr>
            )) : <EmptyRow colSpan={2}>Sem recursos publicados.</EmptyRow>}
          </Table>
        </Panel>
        <Panel title="Publicações por mês (últimos 12 meses)">
          <Table head={["Mês", "Recursos publicados"]}>
            {d.monthly.length ? d.monthly.map((m) => (
              <tr key={m.month}>
                <Td>{m.month}</Td>
                <Td className="tabular-nums">{m.count}</Td>
              </tr>
            )) : <EmptyRow colSpan={2}>Sem publicações nos últimos 12 meses.</EmptyRow>}
          </Table>
        </Panel>
      </div>
    </>
  );
}
