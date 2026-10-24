import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { AdminHeader } from "@/components/admin/ui";
import { UserForm } from "../user-forms";

export const metadata: Metadata = { title: "Nova conta" };

export default async function NewUserPage() {
  await requireRole(["admin"]);
  return (
    <>
      <AdminHeader title="Nova conta" back={{ href: "/admin/utilizadores", label: "Utilizadores" }} description="É gerada uma palavra-passe temporária, apresentada uma única vez." />
      <div className="max-w-xl rounded-md border border-line bg-white p-5 sm:p-8">
        <UserForm />
      </div>
    </>
  );
}
