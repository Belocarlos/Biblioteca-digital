import type { Metadata } from "next";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { AuthorPhoto } from "@/components/site/author-card";
import { TeamMemberForm } from "../settings-forms";

export const metadata: Metadata = { title: "Equipa responsável" };

export default async function TeamPage() {
  const user = await requireRole(["admin"]);
  const members = await asUser(user, (tx) =>
    tx<{ id: string; name: string; role_title: string | null; bio: string | null; position: number; is_published: boolean; photo_authorized: boolean; photo_key: string | null }[]>`
      select id, name, role_title, bio, position, is_published, photo_authorized, photo_key from team_members order by position, name`,
  );
  return (
    <>
      <AdminHeader title="Equipa responsável" back={{ href: "/admin/configuracoes", label: "Configurações" }} description="Publique apenas elementos confirmados e fotografias reais com autorização registada." />
      <div className="max-w-4xl space-y-6">
        {members.map((m) => (
          <Panel key={m.id} title={m.name} actions={<AuthorPhoto photoKey={m.photo_key} alt={m.name} className="h-10 w-10" />}>
            <TeamMemberForm member={m} />
          </Panel>
        ))}
        <Panel title="Adicionar elemento">
          <TeamMemberForm />
        </Panel>
      </div>
    </>
  );
}
