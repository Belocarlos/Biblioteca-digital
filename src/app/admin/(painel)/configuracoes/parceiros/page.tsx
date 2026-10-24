import type { Metadata } from "next";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { Notice } from "@/components/ui/misc";
import { PartnerForm } from "../settings-forms";

export const metadata: Metadata = { title: "Parceiros institucionais" };

export default async function PartnersPage() {
  const user = await requireRole(["admin"]);
  const partners = await asUser(user, (tx) =>
    tx<{ id: string; name: string; url: string | null; description: string | null; position: number; partnership_confirmed: boolean; is_published: boolean; logo_key: string | null }[]>`
      select id, name, url, description, position, partnership_confirmed, is_published, logo_key from partners order by position, name`,
  );
  return (
    <>
      <AdminHeader title="Parceiros institucionais" back={{ href: "/admin/configuracoes", label: "Configurações" }} />
      <Notice tone="warning" className="mb-6 max-w-4xl">
        Não apresente organizações como parceiras sem confirmação formal. A base de dados impede a publicação de parceiros não confirmados.
      </Notice>
      <div className="max-w-4xl space-y-6">
        {partners.map((p) => (
          <Panel key={p.id} title={p.name}>
            <PartnerForm partner={p} />
          </Panel>
        ))}
        <Panel title="Adicionar parceiro">
          <PartnerForm />
        </Panel>
      </div>
    </>
  );
}
