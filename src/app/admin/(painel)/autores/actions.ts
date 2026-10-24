"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db";
import { bool, echo, str, zodErrors, type FormState } from "@/lib/form-utils";
import { authorSchema, parseLinks } from "@/lib/validators";
import { uniqueSlug, UUID_RE } from "@/lib/admin-helpers";
import { isFile, processImage } from "@/lib/uploads";
import { newKey, safeDelete, storage } from "@/lib/storage";

const EDIT_ROLES = ["admin", "editor"] as const;
const DENIED: FormState = { status: "error", message: "Não tem permissão para realizar esta operação." };

function parse(formData: FormData) {
  const parsed = authorSchema.safeParse(Object.fromEntries(Object.keys(authorSchema.shape).map((k) => [k, str(formData, k)])));
  if (!parsed.success) return { ok: false as const, errors: zodErrors(parsed.error) };
  const links = parseLinks(parsed.data.links);
  if (!links.ok) return { ok: false as const, errors: { links: [links.error] } };
  return { ok: true as const, value: { ...parsed.data, links: links.links, isPublished: bool(formData, "is_published"), photoAuthorized: bool(formData, "photo_authorized") } };
}

export async function createAuthor(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const p = parse(formData);
  if (!p.ok) return { status: "error", message: "Verifique os campos assinalados.", errors: p.errors, data: echo(formData) };
  const v = p.value;
  let id: string;
  try {
    id = await asUser(user, async (tx) => {
      const slug = await uniqueSlug(tx, "authors", v.slug || v.name);
      const [row] = await tx<{ id: string }[]>`
        insert into authors (slug, name, sort_name, specialization, country, institution, bio, photo_alt, links, is_published, created_by)
        values (${slug}, ${v.name}, ${v.sort_name || null}, ${v.specialization || null}, ${v.country || null}, ${v.institution || null},
          ${v.bio || null}, ${v.photo_alt || null}, ${tx.json(v.links)}, ${v.isPublished}, ${user.id})
        returning id`;
      return row!.id;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  redirect(`/admin/autores/${id}?ok=criado`);
}

export async function updateAuthor(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  const p = parse(formData);
  if (!p.ok) return { status: "error", message: "Verifique os campos assinalados.", errors: p.errors, data: echo(formData) };
  const v = p.value;
  let removedPhoto: string | null = null;
  try {
    await asUser(user, async (tx) => {
      const [cur] = await tx<{ slug: string; photo_key: string | null }[]>`select slug, photo_key from authors where id = ${id}`;
      if (!cur) throw Object.assign(new Error("Registo não encontrado."), { code: "42501" });
      const slug = v.slug && v.slug !== cur.slug ? await uniqueSlug(tx, "authors", v.slug, id) : cur.slug;
      // Sem autorização registada, a fotografia é removida.
      if (!v.photoAuthorized && cur.photo_key) removedPhoto = cur.photo_key;
      await tx`
        update authors set slug = ${slug}, name = ${v.name}, sort_name = ${v.sort_name || null}, specialization = ${v.specialization || null},
          country = ${v.country || null}, institution = ${v.institution || null}, bio = ${v.bio || null}, photo_alt = ${v.photo_alt || null},
          links = ${tx.json(v.links)}, is_published = ${v.isPublished}, photo_authorized = ${v.photoAuthorized},
          photo_key = ${v.photoAuthorized ? cur.photo_key : null}
        where id = ${id}`;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  await safeDelete(removedPhoto);
  revalidatePath(`/admin/autores/${id}`);
  return { status: "success", message: removedPhoto ? "Alterações guardadas. A fotografia foi removida por falta de autorização." : "Alterações guardadas." };
}

export async function uploadAuthorPhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Pedido inválido." };
  let oldKey: string | null = null;
  let created: string | null = null;
  try {
    if (str(formData, "intent") === "remove") {
      await asUser(user, async (tx) => {
        const [row] = await tx<{ photo_key: string | null }[]>`select photo_key from authors where id = ${id}`;
        oldKey = row?.photo_key ?? null;
        await tx`update authors set photo_key = null where id = ${id}`;
      });
    } else {
      if (!bool(formData, "photo_authorized")) return { status: "error", message: "Confirme que a utilização da fotografia foi autorizada pela pessoa retratada." };
      const file = formData.get("file");
      if (!isFile(file)) return { status: "error", message: "Selecione uma fotografia." };
      const result = await processImage(file, 600);
      if (!result.ok) return { status: "error", message: result.error };
      created = newKey("images", "webp");
      await storage().put(created, result.value.data, "image/webp");
      await asUser(user, async (tx) => {
        const [row] = await tx<{ photo_key: string | null }[]>`select photo_key from authors where id = ${id}`;
        oldKey = row?.photo_key ?? null;
        const res = await tx`update authors set photo_key = ${created}, photo_authorized = true where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      });
    }
  } catch (error) {
    await safeDelete(created);
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(oldKey);
  revalidatePath(`/admin/autores/${id}`);
  return { status: "success", message: created ? "Fotografia carregada." : "Fotografia removida." };
}

export async function deleteAuthor(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id) || !bool(formData, "confirm")) return { status: "error", message: "Confirme a eliminação." };
  let photo: string | null = null;
  try {
    await asUser(user, async (tx) => {
      const rows = await tx<{ photo_key: string | null }[]>`delete from authors where id = ${id} returning photo_key`;
      if (!rows.length) throw Object.assign(new Error("Não foi possível eliminar o perfil."), { code: "42501" });
      photo = rows[0]!.photo_key;
    });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "23503") return { status: "error", message: "O perfil está associado a recursos ou sessões. Remova primeiro essas associações." };
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(photo);
  redirect("/admin/autores?ok=eliminado");
}
