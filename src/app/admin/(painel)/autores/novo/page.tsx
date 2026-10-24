import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { AdminHeader } from "@/components/admin/ui";
import { AuthorForm } from "../author-form";

export const metadata: Metadata = { title: "Novo perfil" };

export default async function NewAuthorPage() {
  await requireRole(["admin", "editor"]);
  return (
    <>
      <AdminHeader title="Novo perfil de autor ou orador" back={{ href: "/admin/autores", label: "Autores" }} description="A fotografia é carregada depois de criar o perfil, mediante registo da autorização." />
      <div className="max-w-3xl rounded-md border border-line bg-white p-5 sm:p-8">
        <AuthorForm canEdit />
      </div>
    </>
  );
}
