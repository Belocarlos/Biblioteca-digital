import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { UUID_RE } from "@/lib/admin-helpers";
import { formatDateTime } from "@/lib/format";
import { ResetPasswordForm, UserForm } from "../user-forms";

export const metadata: Metadata = { title: "Editar conta" };

export default async function EditUserPage({ params }: PageProps<"/admin/utilizadores/[id]">) {
  const user = await requireRole(["admin"]);
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const data = await asUser(user, async (tx) => {
    const [u] = await tx<{ id: string; name: string; email: string; role: string; is_active: boolean; created_at: Date; last_login_at: Date | null }[]>`
      select id, name, email::text, role::text, is_active, created_at, last_login_at from users where id = ${id}`;
    if (!u) return null;
    const log = await tx<{ id: number; action: string; created_at: Date; details: { label?: string } }[]>`
      select id, action, created_at, details from audit_log where actor_id = ${id} order by created_at desc limit 15`;
    return { u, log };
  });
  if (!data) notFound();
  const { u, log } = data;
  return (
    <>
      <AdminHeader title={u.name} back={{ href: "/admin/utilizadores", label: "Utilizadores" }} description={`Conta criada em ${formatDateTime(u.created_at)}. Último acesso: ${u.last_login_at ? formatDateTime(u.last_login_at) : "nunca"}.`} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-md border border-line bg-white p-5 sm:p-8">
          <UserForm values={u} />
        </div>
        <div className="space-y-6">
          {u.id !== user.id ? (
            <Panel title="Palavra-passe">
              <ResetPasswordForm id={u.id} />
            </Panel>
          ) : null}
          <Panel title="Atividade recente">
            {log.length ? (
              <ul className="space-y-2 text-sm">
                {log.map((l) => (
                  <li key={l.id}>
                    <span className="font-mono text-xs">{l.action}</span>
                    {l.details?.label ? <span className="text-muted"> · {l.details.label}</span> : null}
                    <span className="block text-xs text-muted">{formatDateTime(l.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Sem atividade registada.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
