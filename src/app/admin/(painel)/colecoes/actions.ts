"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db";
import { bool, echo, str, zodErrors, type FormState } from "@/lib/form-utils";
import { collectionSchema } from "@/lib/validators";
import { uniqueSlug, UUID_RE } from "@/lib/admin-helpers";

const EDIT_ROLES = ["admin", "editor"] as const;
const DENIED: FormState = { status: "error", message: "Não tem permissão para realizar esta operação." };

function parse(formData: FormData) {
  return collectionSchema.safeParse(Object.fromEntries(Object.keys(collectionSchema.shape).map((k) => [k, str(formData, k)])));
}

export async function createCollection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const p = parse(formData);
  if (!p.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(p.error), data: echo(formData) };
  try {
    await asUser(user, async (tx) => {
      const slug = await uniqueSlug(tx, "collections", p.data.slug || p.data.name);
      await tx`
        insert into collections (slug, name, description, is_published, position)
        values (${slug}, ${p.data.name}, ${p.data.description || null}, ${bool(formData, "is_published")},
          (select coalesce(max(position), 0) + 1 from collections))`;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  redirect("/admin/colecoes?ok=criado");
}

export async function updateCollection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  const p = parse(formData);
  if (!p.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(p.error), data: echo(formData) };
  try {
    await asUser(user, async (tx) => {
      const [cur] = await tx<{ slug: string }[]>`select slug from collections where id = ${id}`;
      if (!cur) throw Object.assign(new Error("Registo não encontrado."), { code: "42501" });
      const slug = p.data.slug && p.data.slug !== cur.slug ? await uniqueSlug(tx, "collections", p.data.slug, id) : cur.slug;
      await tx`update collections set slug = ${slug}, name = ${p.data.name}, description = ${p.data.description || null}, is_published = ${bool(formData, "is_published")} where id = ${id}`;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath(`/admin/colecoes/${id}`);
  return { status: "success", message: "Alterações guardadas." };
}

/** Reorganiza as coleções trocando a posição com a vizinha. */
export async function moveCollection(formData: FormData) {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return;
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? "up" : "down";
  if (!UUID_RE.test(id)) return;
  await asUser(user, async (tx) => {
    const rows = await tx<{ id: string }[]>`select id from collections order by position, name`;
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    for (const [pos, cid] of ids.entries()) {
      await tx`update collections set position = ${pos + 1} where id = ${cid} and position <> ${pos + 1}`;
    }
  });
  revalidatePath("/admin/colecoes");
}

export async function deleteCollection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id) || !bool(formData, "confirm")) return { status: "error", message: "Confirme a eliminação." };
  try {
    await asUser(user, async (tx) => {
      const res = await tx`delete from collections where id = ${id}`;
      if (res.count === 0) throw Object.assign(new Error("Não foi possível eliminar a coleção."), { code: "42501" });
    });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "23503") return { status: "error", message: "A coleção tem recursos associados. Remova primeiro essas associações." };
    return { status: "error", message: dbErrorMessage(error) };
  }
  redirect("/admin/colecoes?ok=eliminado");
}
