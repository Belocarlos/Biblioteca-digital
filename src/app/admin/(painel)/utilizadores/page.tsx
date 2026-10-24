import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, EmptyRow, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function UsersPage() {
  const user = await requireRole(["admin"]);
  const rows = await asUser(user, (tx) =>
    tx<{ id: string; name: string; email: string; role: UserRole; is_active: boolean; must_change_password: boolean; last_login_at: Date | null }[]>`
      select id, name, email, role, is_active, must_change_password, last_login_at from users order by is_active desc, name`,
  );
  return (
    <>
      <AdminHeader
        title="Utilizadores"
        description="Contas da equipa editorial. As permissões são aplicadas no servidor e na base de dados."
        actions={
          <LinkButton href="/admin/utilizadores/novo">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova conta
          </LinkButton>
        }
      />
      <Table head={["Nome", "E-mail", "Função", "Estado", "Último acesso"]}>
        {rows.length ? (
          rows.map((u) => (
            <tr key={u.id} className="hover:bg-surface/60">
              <Td>
                <Link href={`/admin/utilizadores/${u.id}`} className="font-medium text-brand-blue hover:underline">
                  {u.name}
                </Link>
                {u.id === user.id ? <span className="ml-2 text-xs text-muted">(a sua conta)</span> : null}
              </Td>
              <Td className="text-muted">{u.email}</Td>
              <Td>{USER_ROLE_LABELS[u.role]}</Td>
              <Td>
                {!u.is_active ? <Badge>Desativada</Badge> : u.must_change_password ? <Badge tone="warning">Aguarda primeiro acesso</Badge> : <Badge tone="green">Ativa</Badge>}
              </Td>
              <Td className="text-xs text-muted">{u.last_login_at ? formatDateTime(u.last_login_at) : "Nunca"}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5}>Sem utilizadores.</EmptyRow>
        )}
      </Table>
    </>
  );
}
