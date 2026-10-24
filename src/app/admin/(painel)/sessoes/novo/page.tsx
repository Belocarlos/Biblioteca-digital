import type { Metadata } from "next";
import { asUser, requireRole } from "@/lib/auth/session";
import { pickerOptions } from "@/lib/queries/admin";
import { AdminHeader } from "@/components/admin/ui";
import { SessionForm } from "../session-form";

export const metadata: Metadata = { title: "Nova sessão" };

export default async function NewSessionPage() {
  const user = await requireRole(["admin", "editor"]);
  const options = await asUser(user, (tx) => pickerOptions(tx));
  return (
    <>
      <AdminHeader title="Nova sessão" back={{ href: "/admin/sessoes", label: "Sessões" }} description="O cartaz é carregado depois de criar o rascunho." />
      <div className="max-w-4xl rounded-md border border-line bg-white p-5 sm:p-8">
        <SessionForm options={options} canEdit />
      </div>
    </>
  );
}
