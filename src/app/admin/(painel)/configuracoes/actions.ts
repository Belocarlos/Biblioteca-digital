"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage, type Tx } from "@/lib/db";
import { bool, echo, optionalUrl, str, zodErrors, type FormState } from "@/lib/form-utils";
import { parseLinks } from "@/lib/validators";
import { UUID_RE } from "@/lib/admin-helpers";
import { isFile, processImage } from "@/lib/uploads";
import { newKey, safeDelete, storage } from "@/lib/storage";

const DENIED: FormState = { status: "error", message: "Apenas administradores podem alterar as configurações." };

async function setSetting(tx: Tx, key: string, value: unknown) {
  await tx`
    insert into site_settings (key, value, updated_by, updated_at) values (${key}, ${tx.json(value as never)}, app.current_user_id(), now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`;
}

export async function saveGeneralSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const email = str(formData, "contact_email").toLowerCase();
  const errors: Record<string, string[]> = {};
  if (!z.string().email().safeParse(email).success) errors.contact_email = ["Indique um e-mail válido."];
  const links = parseLinks(str(formData, "social_links"));
  if (!links.ok) errors.social_links = [links.error];
  const homeAbout = str(formData, "home_about");
  if (homeAbout.length < 20 || homeAbout.length > 2000) errors.home_about = ["O texto deve ter entre 20 e 2000 caracteres."];
  if (Object.keys(errors).length || !links.ok) return { status: "error", message: "Verifique os campos assinalados.", errors, data: echo(formData) };
  try {
    await asUser(user, async (tx) => {
      await setSetting(tx, "contact_email", email);
      await setSetting(tx, "social_links", links.links);
      await setSetting(tx, "home_about", homeAbout);
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Configurações guardadas." };
}

export async function saveAbout(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const md = str(formData, "about_md");
  if (md.length < 50 || md.length > 30000) return { status: "error", message: "O texto deve ter entre 50 e 30 000 caracteres.", data: echo(formData) };
  try {
    await asUser(user, (tx) => setSetting(tx, "about_md", md));
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath("/sobre");
  return { status: "success", message: "Texto da página Sobre Nós guardado." };
}

export async function uploadShareImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  let oldKey: string | null = null;
  let created: string | null = null;
  try {
    const [row] = await asUser(user, (tx) => tx<{ value: unknown }[]>`select value from site_settings where key = 'og_image_key'`);
    oldKey = typeof row?.value === "string" ? row.value : null;
    if (str(formData, "intent") !== "remove") {
      const file = formData.get("file");
      if (!isFile(file)) return { status: "error", message: "Selecione uma imagem." };
      const result = await processImage(file, 1200);
      if (!result.ok) return { status: "error", message: result.error };
      created = newKey("images", "webp");
      await storage().put(created, result.value.data, "image/webp");
    }
    await asUser(user, (tx) => setSetting(tx, "og_image_key", created));
  } catch (error) {
    await safeDelete(created);
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(oldKey);
  revalidatePath("/", "layout");
  return { status: "success", message: created ? "Imagem de partilha atualizada." : "Imagem de partilha removida. É utilizada a imagem predefinida." };
}

export async function saveLegalDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const slug = str(formData, "slug");
  if (!["politica-de-privacidade", "termos-e-condicoes"].includes(slug)) return { status: "error", message: "Documento inválido." };
  const title = str(formData, "title");
  const body = str(formData, "body_md");
  const approve = bool(formData, "approve");
  if (title.length < 3 || body.length < 100) return { status: "error", message: "Indique o título e o texto completo do documento.", data: echo(formData) };
  try {
    await asUser(user, (tx) =>
      tx`update legal_documents set title = ${title}, body_md = ${body}, review_status = ${approve ? "approved" : "pending_review"} where slug = ${slug}`,
    );
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/configuracoes/legal/${slug}`);
  return { status: "success", message: approve ? "Documento guardado e marcado como aprovado." : "Documento guardado. Fica a aguardar aprovação institucional." };
}

// Equipa e parceiros ---------------------------------------------------------

const teamSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome.").max(160),
  role_title: z.string().trim().max(160),
  bio: z.string().trim().max(1500),
  position: z.coerce.number().int().min(0).max(999),
});

const partnerSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome.").max(200),
  url: optionalUrl,
  description: z.string().trim().max(600),
  position: z.coerce.number().int().min(0).max(999),
});

export async function saveTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  const intent = str(formData, "intent");
  if (id && !UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  let oldKey: string | null = null;
  let created: string | null = null;
  try {
    if (intent === "delete" && id) {
      await asUser(user, async (tx) => {
        const rows = await tx<{ photo_key: string | null }[]>`delete from team_members where id = ${id} returning photo_key`;
        oldKey = rows[0]?.photo_key ?? null;
      });
      await safeDelete(oldKey);
      revalidatePath("/admin/configuracoes/equipa");
      return { status: "success", message: "Elemento removido." };
    }
    const parsed = teamSchema.safeParse({ name: str(formData, "name"), role_title: str(formData, "role_title"), bio: str(formData, "bio"), position: str(formData, "position") || "0" });
    if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
    const v = parsed.data;
    const photoAuthorized = bool(formData, "photo_authorized");
    const file = formData.get("file");
    if (isFile(file)) {
      if (!photoAuthorized) return { status: "error", message: "Confirme a autorização de utilização da fotografia.", data: echo(formData) };
      const result = await processImage(file, 600);
      if (!result.ok) return { status: "error", message: result.error, data: echo(formData) };
      created = newKey("images", "webp");
      await storage().put(created, result.value.data, "image/webp");
    }
    await asUser(user, async (tx) => {
      if (id) {
        const [cur] = await tx<{ photo_key: string | null }[]>`select photo_key from team_members where id = ${id}`;
        const keep = photoAuthorized ? (created ?? cur?.photo_key ?? null) : null;
        if (cur?.photo_key && cur.photo_key !== keep) oldKey = cur.photo_key;
        await tx`update team_members set name = ${v.name}, role_title = ${v.role_title || null}, bio = ${v.bio || null}, position = ${v.position},
          is_published = ${bool(formData, "is_published")}, photo_authorized = ${photoAuthorized}, photo_key = ${keep} where id = ${id}`;
      } else {
        await tx`insert into team_members (name, role_title, bio, position, is_published, photo_authorized, photo_key)
          values (${v.name}, ${v.role_title || null}, ${v.bio || null}, ${v.position}, ${bool(formData, "is_published")}, ${photoAuthorized}, ${created})`;
      }
    });
  } catch (error) {
    await safeDelete(created);
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  await safeDelete(oldKey);
  revalidatePath("/admin/configuracoes/equipa");
  return { status: "success", message: id ? "Alterações guardadas." : "Elemento adicionado." };
}

export async function savePartner(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  const intent = str(formData, "intent");
  if (id && !UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  let oldKey: string | null = null;
  let created: string | null = null;
  try {
    if (intent === "delete" && id) {
      await asUser(user, async (tx) => {
        const rows = await tx<{ logo_key: string | null }[]>`delete from partners where id = ${id} returning logo_key`;
        oldKey = rows[0]?.logo_key ?? null;
      });
      await safeDelete(oldKey);
      revalidatePath("/admin/configuracoes/parceiros");
      return { status: "success", message: "Parceiro removido." };
    }
    const parsed = partnerSchema.safeParse({ name: str(formData, "name"), url: str(formData, "url"), description: str(formData, "description"), position: str(formData, "position") || "0" });
    if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
    const v = parsed.data;
    const confirmed = bool(formData, "partnership_confirmed");
    const published = bool(formData, "is_published");
    if (published && !confirmed) return { status: "error", message: "Só é possível publicar parceiros com parceria formalmente confirmada.", data: echo(formData) };
    const file = formData.get("file");
    if (isFile(file)) {
      const result = await processImage(file, 600);
      if (!result.ok) return { status: "error", message: result.error, data: echo(formData) };
      created = newKey("images", "webp");
      await storage().put(created, result.value.data, "image/webp");
    }
    await asUser(user, async (tx) => {
      if (id) {
        const [cur] = await tx<{ logo_key: string | null }[]>`select logo_key from partners where id = ${id}`;
        if (created && cur?.logo_key) oldKey = cur.logo_key;
        await tx`update partners set name = ${v.name}, url = ${v.url || null}, description = ${v.description || null}, position = ${v.position},
          partnership_confirmed = ${confirmed}, is_published = ${published}, logo_key = ${created ?? cur?.logo_key ?? null} where id = ${id}`;
      } else {
        await tx`insert into partners (name, url, description, position, partnership_confirmed, is_published, logo_key)
          values (${v.name}, ${v.url || null}, ${v.description || null}, ${v.position}, ${confirmed}, ${published}, ${created})`;
      }
    });
  } catch (error) {
    await safeDelete(created);
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  await safeDelete(oldKey);
  revalidatePath("/admin/configuracoes/parceiros");
  return { status: "success", message: id ? "Alterações guardadas." : "Parceiro adicionado." };
}
