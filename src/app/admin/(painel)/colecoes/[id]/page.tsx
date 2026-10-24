import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asUser, requireRole } from "@/lib/auth/session";
import { AdminHeader, Flash, Panel } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/forms";
import { UUID_RE } from "@/lib/admin-helpers";
import { canEditContent } from "@/lib/workflow";
import { CollectionForm } from "../collection-form";
import { deleteCollection } from "../actions";

export const metadata: Metadata = { title: "Editar coleção" };

export default async function EditCollectionPage({ params, searchParams }: PageProps<"/admin/colecoes/[id]">) {
  const user = await requireRole(["admin", "editor", "reviewer"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const [c] = await asUser(user, (tx) => tx<{ id: string; name: string; slug: string; description: string | null; is_published: boolean }[]>`select id, name, slug, description, is_published from collections where id = ${id}`);
  if (!c) notFound();
  return (
    <>
      <AdminHeader title={c.name} back={{ href: "/admin/colecoes", label: "Coleções" }} />
      <Flash ok={sp.ok} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-md border border-line bg-white p-5 sm:p-8">
          <CollectionForm canEdit={canEditContent(user.role)} values={c} />
        </div>
        {user.role === "admin" ? (
          <Panel title="Eliminar coleção">
            <DeleteForm action={deleteCollection} id={c.id} label={c.name} warning="Só é possível eliminar coleções sem recursos associados." />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
