import type { Metadata } from "next";
import { asUser, requireRole } from "@/lib/auth/session";
import { pickerOptions } from "@/lib/queries/admin";
import { AdminHeader } from "@/components/admin/ui";
import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Novo recurso" };

export default async function NewResourcePage() {
  const user = await requireRole(["admin", "editor"]);
  const options = await asUser(user, (tx) => pickerOptions(tx));
  return (
    <>
      <AdminHeader title="Novo recurso" back={{ href: "/admin/recursos", label: "Recursos" }} description="Preencha os metadados. O ficheiro PDF e a capa são carregados depois de criar o rascunho." />
      <div className="max-w-4xl rounded-md border border-line bg-white p-5 sm:p-8">
        <ResourceForm options={options} canEdit />
      </div>
    </>
  );
}
