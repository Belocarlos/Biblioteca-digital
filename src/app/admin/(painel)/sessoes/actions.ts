"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage, type Tx } from "@/lib/db";
import { EDITORIAL_STATUSES, type EditorialStatus } from "@/lib/constants";
import { bool, echo, list, str, zodErrors, type FormState } from "@/lib/form-utils";
import { sessionSchema } from "@/lib/validators";
import { uniqueSlug, UUID_RE } from "@/lib/admin-helpers";
import { TIMEZONES, zonedLocalToUtc } from "@/lib/format";
import { isFile, processImage } from "@/lib/uploads";
import { newKey, safeDelete, storage } from "@/lib/storage";

const EDIT_ROLES = ["admin", "editor"] as const;
const STAFF = ["admin", "editor", "reviewer"] as const;
const DENIED: FormState = { status: "error", message: "Não tem permissão para realizar esta operação." };

function parse(formData: FormData) {
  const raw = Object.fromEntries(Object.keys(sessionSchema.shape).map((k) => [k, str(formData, k)]));
  const parsed = sessionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, errors: zodErrors(parsed.error) };
  const v = parsed.data;
  const errors: Record<string, string[]> = {};
  const tz = TIMEZONES.some((t) => t.id === v.timezone) ? v.timezone : "Europe/Lisbon";
  const startsAt = v.starts_at ? zonedLocalToUtc(v.starts_at, tz) : null;
  const endsAt = v.ends_at ? zonedLocalToUtc(v.ends_at, tz) : null;
  if (startsAt && endsAt && endsAt < startsAt) errors.ends_at = ["A hora de fim deve ser posterior à hora de início."];
  if (endsAt && !startsAt) errors.starts_at = ["Indique a data de início."];
  const recordingAuthorized = bool(formData, "recording_authorized");
  if (v.recording_url && !recordingAuthorized) errors.recording_authorized = ["Confirme a autorização para disponibilizar a gravação."];
  if (Object.keys(errors).length) return { ok: false as const, errors };
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    ok: true as const,
    value: { ...v, timezone: tz, startsAt, endsAt, recordingAuthorized, topics: lines(v.topics).slice(0, 30) },
  };
}

async function saveRelations(tx: Tx, sessionId: string, formData: FormData) {
  const speakerIds = list(formData, "speaker_ids");
  const speakerRoles = list(formData, "speaker_roles");
  const resourceIds = list(formData, "resource_ids");
  const resourceRelations = list(formData, "resource_relations");

  await tx`delete from session_speakers where session_id = ${sessionId}`;
  const seenSpeakers = new Set<string>();
  for (const [i, authorId] of speakerIds.entries()) {
    if (!UUID_RE.test(authorId) || seenSpeakers.has(authorId)) continue;
    seenSpeakers.add(authorId);
    const role = speakerRoles[i] === "moderator" ? "moderator" : "speaker";
    await tx`insert into session_speakers (session_id, author_id, position, role) values (${sessionId}, ${authorId}, ${i}, ${role})`;
  }
  await tx`delete from session_resources where session_id = ${sessionId}`;
  const seenResources = new Set<string>();
  for (const [i, resourceId] of resourceIds.entries()) {
    if (!UUID_RE.test(resourceId) || seenResources.has(resourceId)) continue;
    seenResources.add(resourceId);
    const relation = ["presentation", "recording"].includes(resourceRelations[i] ?? "") ? resourceRelations[i] : "related";
    await tx`insert into session_resources (session_id, resource_id, relation, position) values (${sessionId}, ${resourceId}, ${relation!}, ${i})`;
  }
}

export async function createSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const p = parse(formData);
  if (!p.ok) return { status: "error", message: "Verifique os campos assinalados.", errors: p.errors, data: echo(formData) };
  const v = p.value;
  let id: string;
  try {
    id = await asUser(user, async (tx) => {
      const slug = await uniqueSlug(tx, "program_sessions", v.slug || v.title);
      const [row] = await tx<{ id: string }[]>`
        insert into program_sessions (slug, title, summary, description, starts_at, ends_at, timezone, format, topics, references_text,
          poster_alt, recording_url, recording_authorized, event_status)
        values (${slug}, ${v.title}, ${v.summary || null}, ${v.description || null}, ${v.startsAt}, ${v.endsAt}, ${v.timezone},
          ${v.format || null}, ${v.topics}, ${v.references_text || null}, ${v.poster_alt || null}, ${v.recording_url || null},
          ${v.recordingAuthorized}, ${v.event_status})
        returning id`;
      await saveRelations(tx, row!.id, formData);
      return row!.id;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  redirect(`/admin/sessoes/${id}?ok=criado`);
}

export async function updateSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  const p = parse(formData);
  if (!p.ok) return { status: "error", message: "Verifique os campos assinalados.", errors: p.errors, data: echo(formData) };
  const v = p.value;
  try {
    await asUser(user, async (tx) => {
      const [current] = await tx<{ slug: string; published_at: Date | null }[]>`select slug, published_at from program_sessions where id = ${id}`;
      if (!current) throw Object.assign(new Error("Registo não encontrado."), { code: "42501" });
      const slug = current.published_at ? current.slug : v.slug && v.slug !== current.slug ? await uniqueSlug(tx, "program_sessions", v.slug, id) : current.slug;
      await tx`
        update program_sessions set slug = ${slug}, title = ${v.title}, summary = ${v.summary || null}, description = ${v.description || null},
          starts_at = ${v.startsAt}, ends_at = ${v.endsAt}, timezone = ${v.timezone}, format = ${v.format || null}, topics = ${v.topics},
          references_text = ${v.references_text || null}, poster_alt = ${v.poster_alt || null}, recording_url = ${v.recording_url || null},
          recording_authorized = ${v.recordingAuthorized}, event_status = ${v.event_status}
        where id = ${id}`;
      await saveRelations(tx, id, formData);
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath(`/admin/sessoes/${id}`);
  return { status: "success", message: "Alterações guardadas." };
}

export async function transitionSession(_prev: FormState, formData: FormData): Promise<FormState> {
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
        const res = await tx`update program_sessions set status = ${to} where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      },
      { note: note || null },
    );
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  revalidatePath(`/admin/sessoes/${id}`);
  return { status: "success", message: "Estado editorial atualizado." };
}

export async function uploadPoster(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Pedido inválido." };
  let oldKey: string | null = null;
  let created: string | null = null;
  try {
    if (str(formData, "intent") === "remove") {
      await asUser(user, async (tx) => {
        const [row] = await tx<{ poster_key: string | null }[]>`select poster_key from program_sessions where id = ${id}`;
        oldKey = row?.poster_key ?? null;
        await tx`update program_sessions set poster_key = null where id = ${id}`;
      });
    } else {
      const file = formData.get("file");
      if (!isFile(file)) return { status: "error", message: "Selecione uma imagem." };
      const result = await processImage(file, 1200);
      if (!result.ok) return { status: "error", message: result.error };
      created = newKey("images", "webp");
      await storage().put(created, result.value.data, "image/webp");
      await asUser(user, async (tx) => {
        const [row] = await tx<{ poster_key: string | null }[]>`select poster_key from program_sessions where id = ${id}`;
        oldKey = row?.poster_key ?? null;
        const res = await tx`update program_sessions set poster_key = ${created} where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Não tem permissão para alterar este registo."), { code: "42501" });
      });
    }
  } catch (error) {
    await safeDelete(created);
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(oldKey);
  revalidatePath(`/admin/sessoes/${id}`);
  return { status: "success", message: created ? "Cartaz carregado." : "Cartaz removido." };
}

export async function deleteSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(EDIT_ROLES);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id) || !bool(formData, "confirm")) return { status: "error", message: "Confirme a eliminação." };
  let poster: string | null = null;
  try {
    await asUser(user, async (tx) => {
      const rows = await tx<{ poster_key: string | null }[]>`delete from program_sessions where id = ${id} returning poster_key`;
      if (!rows.length) throw Object.assign(new Error("Não é possível eliminar esta sessão. Os editores só podem eliminar rascunhos."), { code: "42501" });
      poster = rows[0]!.poster_key;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(poster);
  redirect("/admin/sessoes?ok=eliminado");
}
