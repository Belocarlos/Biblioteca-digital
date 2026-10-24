import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS } from "@/lib/constants";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { MetaList, Notice } from "@/components/ui/misc";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "A minha conta" };

export default async function AccountPage({ searchParams }: PageProps<"/admin/conta">) {
  const user = await requireUser({ allowPasswordChange: true });
  const sp = await searchParams;
  return (
    <>
      <AdminHeader title="A minha conta" />
      {user.mustChangePassword || sp.obrigatorio ? (
        <Notice tone="warning" title="Alteração de palavra-passe obrigatória" className="mb-6 max-w-3xl">
          Por segurança, defina uma nova palavra-passe antes de utilizar o painel. A palavra-passe atual foi atribuída por um administrador.
        </Notice>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Dados da conta">
          <MetaList
            items={[
              { label: "Nome", value: user.name },
              { label: "E-mail", value: user.email },
              { label: "Função", value: `${USER_ROLE_LABELS[user.role]}. ${USER_ROLE_DESCRIPTIONS[user.role]}` },
            ]}
          />
        </Panel>
        <Panel title="Alterar palavra-passe" description="Ao alterar a palavra-passe, as restantes sessões abertas são terminadas.">
          <PasswordForm />
        </Panel>
      </div>
    </>
  );
}
