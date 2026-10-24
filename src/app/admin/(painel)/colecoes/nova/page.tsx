import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { AdminHeader } from "@/components/admin/ui";
import { CollectionForm } from "../collection-form";

export const metadata: Metadata = { title: "Nova coleção" };

export default async function NewCollectionPage() {
  await requireRole(["admin", "editor"]);
  return (
    <>
      <AdminHeader title="Nova coleção" back={{ href: "/admin/colecoes", label: "Coleções" }} />
      <div className="max-w-2xl rounded-md border border-line bg-white p-5 sm:p-8">
        <CollectionForm canEdit />
      </div>
    </>
  );
}
