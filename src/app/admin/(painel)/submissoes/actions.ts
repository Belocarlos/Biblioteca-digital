"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/constants";
import { bool, str, type FormState } from "@/lib/form-utils";
import { uniqueSlug, UUID_RE } from "@/lib/admin-helpers";
import { newKey, safeDelete, storage } from "@/lib/storage";

const STAFF = ["admin", "editor", "reviewer"] as const;
const DENIED: FormState = { status: "error", message: "Não tem permissão para realizar esta operação." };

export async function updateSubmissionStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(STAFF);
  if (!user) return DENIED;
  const id = str(formData, "id");
  const to = str(formData, "to") as SubmissionStatus;
  const note = str(formData, "note").slice(0, 2000);
  if (!UUID_RE.test(id) || !SUBMISSION_STATUSES.includes(to)) return { status: "error", message: "Pedido inválido." };
  if (to === "rejected" && note.length < 5) return { status: "error", message: "Indique na nota o motivo da recusa." };
  try {
    await asUser(
      user,
      async (tx) => {
        const res = await tx`update submissions set status = ${to} where id = ${id}`;
        if (res.count === 0) throw Object.assign(new Error("Submissão não encontrada."), { code: "42501" });
      },
      { note: note || null },
    );
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  revalidatePath(`/admin/submissoes/${id}`);
  return { status: "success", message: "Estado da submissão atualizado." };
}

/** Cria um recurso em rascunho a partir de uma submissão em análise ou aceite. */
export async function convertSubmission(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin", "editor"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Pedido inválido." };

  let copiedKey: string | null = null;
  let resourceId: string;
  try {
    const [sub] = await asUser(user, (tx) =>
      tx<{ id: string; status: SubmissionStatus; resource_id: string | null; title: string; material_type: string; authors_text: string; abstract: string; keywords: string[]; file_key: string | null; file_name: string | null; file_size: number | null; external_url: string | null; license_info: string; reference_code: string; submitter_name: string }[]>`
        select * from submissions where id = ${id}`,
    );
    if (!sub) return { status: "error", message: "Submissão não encontrada." };
    if (sub.resource_id) return { status: "error", message: "Esta submissão já foi convertida num recurso." };
    if (!["under_review", "accepted"].includes(sub.status)) return { status: "error", message: "Apenas submissões em análise ou aceites podem ser convertidas." };

    if (sub.file_key) {
      const obj = await storage().get(sub.file_key);
      if (obj) {
        const buffer = Buffer.from(await new Response(obj.body).arrayBuffer());
        copiedKey = newKey("documents", "pdf");
        await storage().put(copiedKey, buffer, "application/pdf");
      }
    }

    resourceId = await asUser(
      user,
      async (tx) => {
        const slug = await uniqueSlug(tx, "resources", sub.title);
        const [row] = await tx<{ id: string }[]>`
          insert into resources (slug, title, resource_type, abstract, keywords, external_url, file_key, file_name, file_size, license, license_details)
          values (${slug}, ${sub.title}, ${sub.material_type}, ${sub.abstract}, ${sub.keywords}, ${sub.external_url},
            ${copiedKey}, ${copiedKey ? sub.file_name : null}, ${copiedKey ? sub.file_size : null}, 'other',
            ${`Informação prestada na submissão ${sub.reference_code}: ${sub.license_info}`})
          returning id`;
        await tx`update submissions set resource_id = ${row!.id}, status = case when status = 'under_review' then 'accepted'::app.submission_status else status end where id = ${id}`;
        await tx`select app.log_action('submissions.converted', 'submissions', ${id}, ${tx.json({ resource_id: row!.id, authors_text: sub.authors_text })})`;
        return row!.id;
      },
      { note: "Convertida em recurso para preparação editorial." },
    );
  } catch (error) {
    await safeDelete(copiedKey);
    return { status: "error", message: dbErrorMessage(error) };
  }
  redirect(`/admin/recursos/${resourceId}?ok=convertido`);
}

export async function deleteSubmission(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id) || !bool(formData, "confirm")) return { status: "error", message: "Confirme a eliminação." };
  let fileKey: string | null = null;
  try {
    await asUser(user, async (tx) => {
      const rows = await tx<{ file_key: string | null }[]>`delete from submissions where id = ${id} returning file_key`;
      if (!rows.length) throw Object.assign(new Error("Submissão não encontrada."), { code: "42501" });
      fileKey = rows[0]!.file_key;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  await safeDelete(fileKey);
  redirect("/admin/submissoes?ok=eliminado");
}
