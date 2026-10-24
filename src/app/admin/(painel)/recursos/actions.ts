"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage, type Tx } from "@/lib/db";
import { EDITORIAL_STATUSES, LIMITS, licenseInfo, type EditorialStatus } from "@/lib/constants";
import { bool, echo, keywords, list, str, zodErrors, type FormState } from "@/lib/form-utils";
import { resourceSchema } from "@/lib/validators";
import { uniqueSlug, uuidList, UUID_RE } from "@/lib/admin-helpers";
import { isFile, processImage, validatePdf } from "@/lib/uploads";
import { newKey, safeDelete, storage } from "@/lib/storage";

const EDIT_ROLES = ["admin", "editor"] as const;
const STAFF = ["admin", "editor", "reviewer"] as const;
const DENIED: FormState = { status: "error", message: "Não tem permissão para realizar esta operação." };

function parseResource(formData: FormData) {
  const raw = Object.fromEntries(Object.keys(resourceSchema.shape).map((k) => [k, str(formData, k)]));
  return resourceSchema.safeParse(raw);
}

async function saveAssociations(tx: Tx, resourceId: string, formData: FormData) {
  const authorIds = uuidList(list(formData, "author_ids"));
  const collectionIds = uuidList(list(formData, "collection_ids"));
  const sessionIds = uuidList(list(formData, "session_ids"));

  await tx`delete from resource_authors where resource_id = ${resourceId}`;
  for (const [i, authorId] of authorIds.entries()) {
    await tx`insert into resource_authors (resource_id, author_id, position) values (${resourceId}, ${authorId}, ${i})`;
  }
  await tx`delete from resource_collections where resource_id = ${resourceId}`;
  for (const [i, collectionId] of collectionIds.entries()) {
    await tx`insert into resource_collections (resource_id, collection_id, position) values (${resourceId}, ${collectionId}, ${i})`;
  }
  if (sessionIds.length) {
    await tx`delete from session_resources where resource_id = ${resourceId} and not (session_id = any(${sessionIds}::uuid[]))`;
  } else {
    await tx`delete from session_resources where resource_id = ${resourceId}`;
  }
  for (const sessionId of sessionIds) {
    await tx`
      insert into session_resources (session_id, resource_id, relation, position)
      values (${sessionId}, ${resourceId}, 'related', 100)
      on conflict (session_id, resource_id) do nothing`;
  }
}

function rightsError(license: string, allowDownload: boolean, details: string) {
  if (allowDownload && !licenseInfo(license).permitsRedistribution && details.length < 10) {
    return "Com esta licença, o descarregamento só pode ser ativado se descrever a autorização obtida no campo «Direitos de utilização».";
  }
  return null;
}

export async function createResource(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const parsed = parseResource(formData);
  if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
  const v = parsed.data;

  let id: string;
  try {
    id = await asUser(user, async (tx) => {
      const slug = await uniqueSlug(tx, "resources", v.slug || v.title);
      const [row] = await tx<{ id: string }[]>`
        insert into resources (
          slug, title, subtitle, resource_type, publication_year, language, country, knowledge_area,
          publisher, doi, isbn, abstract, keywords, license, license_details, rights_holder, external_url
        ) values (
          ${slug}, ${v.title}, ${v.subtitle || null}, ${v.resource_type}, ${v.publication_year ? Number(v.publication_year) : null},
          ${v.language}, ${v.country || null}, ${v.knowledge_area || null}, ${v.publisher || null}, ${v.doi || null},
          ${v.isbn || null}, ${v.abstract || null}, ${keywords(v.keywords)}, ${v.license}, ${v.license_details || null},
          ${v.rights_holder || null}, ${v.external_url || null}
        ) returning id`;
      await saveAssociations(tx, row!.id, formData);
      return row!.id;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  redirect(`/admin/recursos/${id}?ok=criado`);
}

export async function updateResource(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  const parsed = parseResource(formData);
  if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
  const v = parsed.data;
  const allowReading = bool(formData, "allow_online_reading");
  const allowDownload = bool(formData, "allow_download");
  const rights = rightsError(v.license, allowDownload, v.license_details);
  if (rights) return { status: "error", message: rights, errors: { license_details: [rights] }, data: echo(formData) };

  try {
    await asUser(user, async (tx) => {
      const [current] = await tx<{ file_key: string | null; published_at: Date | null; slug: string }[]>`
        select file_key, published_at, slug from resources where id = ${id}`;
      if (!current) throw Object.assign(new Error("Registo não encontrado."), { code: "42501" });
      if ((allowReading || allowDownload) && !current.file_key) {
        throw Object.assign(new Error("Carregue o ficheiro PDF antes de autorizar a leitura online ou o descarregamento."), { code: "42501" });
      }
      // O endereço permanente não muda depois da primeira publicação.
      const slug = current.published_at ? current.slug : v.slug && v.slug !== current.slug ? await uniqueSlug(tx, "resources", v.slug, id) : current.slug;
      await tx`
        update resources set
          slug = ${slug}, title = ${v.title}, subtitle = ${v.subtitle || null}, resource_type = ${v.resource_type},
          publication_year = ${v.publication_year ? Number(v.publication_year) : null}, language = ${v.language},
          country = ${v.country || null}, knowledge_area = ${v.knowledge_area || null}, publisher = ${v.publisher || null},
          doi = ${v.doi || null}, isbn = ${v.isbn || null}, abstract = ${v.abstract || null}, keywords = ${keywords(v.keywords)},
          license = ${v.license}, license_details = ${v.license_details || null}, rights_holder = ${v.rights_holder || null},
          external_url = ${v.external_url || null}, allow_online_reading = ${allowReading}, allow_download = ${allowDownload}
        where id = ${id}`;
      await saveAssociations(tx, id, formData);
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath(`/admin/recursos/${id}`);
  return { status: "success", message: "Alterações guardadas." };
}

export async function transitionResource(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(STAFF);
  if (!user) return DENIED;
  const id = str(formData, "id");
  const to = str(formData, "to") as EditorialStatus;
  const note = str(formData, "note").slice(0, 1000);
  if (!UUID_RE.test(id) || !EDITORIAL_STATUSES.includes(to)) return { status: "error", message: "Pedido inválido." };

  try {
    await asUser(
      user,
      async (tx) => {
        if (to === "approved" || to === "published") {
          const [r] = await tx<{ authors: number; publisher: string | null; abstract: string | null; has_access: boolean }[]>`
            select (select count(*)::int from resource_authors where resource_id = r.id) as authors, r.publisher, r.abstract,
                   (r.file_key is not null or r.external_url is not null) as has_access
            from resources r where r.id = ${id}`;
          if (!r) throw Object.assign(new Error("Registo não encontrado."), { code: "42501" });
          const problems = [
            r.authors === 0 && !r.publisher ? "associe pelo menos um autor ou indique a instituição ou editora" : null,
            !r.abstract ? "preencha o resumo" : null,
          ].filter(Boolean);
          if (problems.length) {
            throw Object.assign(new Error(`Antes de ${to === "approved" ? "aprovar" : "publicar"}, ${problems.join(" e ")}.`), { code: "42501" });
          }
        }
        const result = await tx`update resources set status = ${to} where id = ${id}`;
        if (result.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      },
      { note: note || null },
    );
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  revalidatePath(`/admin/recursos/${id}`);
  return { status: "success", message: "Estado editorial atualizado." };
}

export async function uploadResourceFile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  const field = str(formData, "field");
  const intent = str(formData, "intent");
  if (!UUID_RE.test(id) || !["file", "cover"].includes(field)) return { status: "error", message: "Pedido inválido." };

  let oldKey: string | null = null;
  let newKeyValue: string | null = null;
  try {
    if (intent === "remove") {
      await asUser(user, async (tx) => {
        const [row] = await tx<{ file_key: string | null; cover_key: string | null }[]>`select file_key, cover_key from resources where id = ${id}`;
        oldKey = field === "file" ? (row?.file_key ?? null) : (row?.cover_key ?? null);
        if (field === "file") {
          await tx`update resources set file_key = null, file_name = null, file_size = null, allow_online_reading = false, allow_download = false where id = ${id}`;
        } else {
          await tx`update resources set cover_key = null where id = ${id}`;
        }
      });
      await safeDelete(oldKey);
      revalidatePath(`/admin/recursos/${id}`);
      return { status: "success", message: field === "file" ? "Ficheiro removido. A leitura e o descarregamento foram desativados." : "Capa removida." };
    }

    const file = formData.get("file");
    if (!isFile(file)) return { status: "error", message: "Selecione um ficheiro." };

    if (field === "file") {
      const result = await validatePdf(file, LIMITS.pdfAdminBytes);
      if (!result.ok) return { status: "error", message: result.error };
      newKeyValue = newKey("documents", "pdf");
      await storage().put(newKeyValue, result.value.data, "application/pdf");
      await asUser(user, async (tx) => {
        const [row] = await tx<{ file_key: string | null }[]>`select file_key from resources where id = ${id}`;
        oldKey = row?.file_key ?? null;
        const res = await tx`update resources set file_key = ${newKeyValue}, file_name = ${result.value.name}, file_size = ${result.value.data.length} where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      });
    } else {
      const result = await processImage(file, 900);
      if (!result.ok) return { status: "error", message: result.error };
      newKeyValue = newKey("images", "webp");
      await storage().put(newKeyValue, result.value.data, "image/webp");
      await asUser(user, async (tx) => {
        const [row] = await tx<{ cover_key: string | null }[]>`select cover_key from resources where id = ${id}`;
        oldKey = row?.cover_key ?? null;
        const res = await tx`update resources set cover_key = ${newKeyValue} where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      });
    }
  } catch (error) {
    await safeDelete(newKeyValue);
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(oldKey);
  revalidatePath(`/admin/recursos/${id}`);
  return { status: "success", message: field === "file" ? "Ficheiro PDF carregado." : "Capa carregada." };
}

export async function deleteResource(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id) || !bool(formData, "confirm")) return { status: "error", message: "Confirme a eliminação." };
  let keys: (string | null)[] = [];
  try {
    await asUser(user, async (tx) => {
      const rows = await tx<{ file_key: string | null; cover_key: string | null }[]>`
        delete from resources where id = ${id} returning file_key, cover_key`;
      if (!rows.length) {
        throw Object.assign(new Error("Não é possível eliminar este recurso. Os editores só podem eliminar rascunhos; os restantes devem ser arquivados."), { code: "42501" });
      }
      keys = [rows[0]!.file_key, rows[0]!.cover_key];
      await tx`update submissions set resource_id = null where resource_id = ${id}`;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  for (const k of keys) await safeDelete(k);
  redirect("/admin/recursos?ok=eliminado");
}
