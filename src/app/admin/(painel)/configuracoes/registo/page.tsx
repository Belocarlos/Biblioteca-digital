import type { Metadata } from "next";
import { asUser, requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, EmptyRow, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Registo de atividade" };

const ACTION_LABELS: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Eliminação",
};

function describe(action: string) {
  if (action === "auth.login") return "Entrada no painel";
  if (action === "auth.logout") return "Saída do painel";
  if (action === "auth.password_changed") return "Alteração da própria palavra-passe";
  if (action === "auth.password_reset") return "Reposição de palavra-passe";
  if (action === "submissions.converted") return "Submissão convertida em recurso";
  if (action === "cli.admin_created") return "Administrador criado pela linha de comandos";
  const [, op] = action.split(".");
  return ACTION_LABELS[op ?? ""] ?? action;
}

const ENTITY_LABELS: Record<string, string> = {
  resources: "Recurso",
  program_sessions: "Sessão",
  authors: "Autor",
  collections: "Coleção",
  team_members: "Equipa",
  partners: "Parceiro",
  site_settings: "Configuração",
  legal_documents: "Documento jurídico",
  users: "Utilizador",
  submissions: "Submissão",
};

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/configuracoes/registo">) {
  const user = await requireRole(["admin"]);
  const sp = await searchParams;
  const page = typeof sp.pagina === "string" && /^\d{1,4}$/.test(sp.pagina) ? Number(sp.pagina) : 1;
  const per = 50;
  const { rows, total } = await asUser(user, async (tx) => {
    const [rows, [{ total }]] = await Promise.all([
      tx<{ id: number; action: string; entity_type: string | null; details: { label?: string; changed?: string[]; status?: { from: string; to: string } }; created_at: Date; actor: string | null }[]>`
        select l.id, l.action, l.entity_type, l.details, l.created_at, u.name as actor
        from audit_log l left join users u on u.id = l.actor_id
        order by l.created_at desc limit ${per} offset ${(page - 1) * per}`,
      tx<{ total: number }[]>`select count(*)::int as total from audit_log`,
    ]);
    return { rows, total };
  });
  return (
    <>
      <AdminHeader title="Registo de atividade" back={{ href: "/admin/configuracoes", label: "Configurações" }} description="Registo das ações administrativas relevantes, gerado pela base de dados. Não pode ser alterado pela aplicação." />
      <Table head={["Data", "Utilizador", "Ação", "Objeto", "Detalhes"]}>
        {rows.length ? (
          rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(r.created_at)}</Td>
              <Td>{r.actor ?? <span className="text-muted">Sistema ou público</span>}</Td>
              <Td>{describe(r.action)}</Td>
              <Td>
                {r.entity_type ? <span className="text-muted">{ENTITY_LABELS[r.entity_type] ?? r.entity_type}: </span> : null}
                {r.details?.label}
              </Td>
              <Td className="text-xs text-muted">
                {r.details?.status ? `Estado: ${r.details.status.from} para ${r.details.status.to}. ` : ""}
                {r.details?.changed?.length ? `Campos: ${r.details.changed.join(", ")}` : ""}
              </Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5}>Sem registos.</EmptyRow>
        )}
      </Table>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / per))} hrefFor={(p) => `/admin/configuracoes/registo?pagina=${p}`} />
    </>
  );
}
