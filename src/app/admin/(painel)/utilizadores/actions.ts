"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser, asUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { USER_ROLES } from "@/lib/constants";
import { bool, echo, str, zodErrors, type FormState } from "@/lib/form-utils";
import { UUID_RE } from "@/lib/admin-helpers";

const DENIED: FormState = { status: "error", message: "Apenas administradores podem gerir utilizadores." };

const schema = z.object({
  name: z.string().trim().min(2, "Indique o nome.").max(160),
  email: z.string().trim().toLowerCase().email("Indique um e-mail válido.").max(254),
  role: z.enum(USER_ROLES, { message: "Selecione a função." }),
});

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return `${Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("")}-${randomBytes(2).toString("hex")}A7`;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const parsed = schema.safeParse({ name: str(formData, "name"), email: str(formData, "email"), role: str(formData, "role") });
  if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
  const temp = temporaryPassword();
  const hash = await hashPassword(temp);
  try {
    await asUser(user, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into users (email, name, role, must_change_password) values (${parsed.data.email}, ${parsed.data.name}, ${parsed.data.role}, true) returning id`;
      await tx`select app.auth_set_password(${row!.id}::uuid, ${hash}, null)`;
    });
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath("/admin/utilizadores");
  return {
    status: "success",
    message: `Conta criada. Palavra-passe temporária: ${temp}. Comunique-a por um canal seguro. Não voltará a ser apresentada e terá de ser alterada no primeiro acesso.`,
  };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  const parsed = schema.safeParse({ name: str(formData, "name"), email: str(formData, "email"), role: str(formData, "role") });
  if (!parsed.success) return { status: "error", message: "Verifique os campos assinalados.", errors: zodErrors(parsed.error), data: echo(formData) };
  const active = bool(formData, "is_active");
  try {
    await asUser(user, (tx) => tx`update users set name = ${parsed.data.name}, email = ${parsed.data.email}, role = ${parsed.data.role}, is_active = ${active} where id = ${id}`);
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error), data: echo(formData) };
  }
  revalidatePath(`/admin/utilizadores/${id}`);
  return { status: "success", message: active ? "Alterações guardadas." : "Alterações guardadas. A conta está desativada e as sessões abertas foram terminadas." };
}

export async function resetUserPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionUser(["admin"]);
  if (!user) return DENIED;
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return { status: "error", message: "Registo inválido." };
  if (id === user.id) return { status: "error", message: "Para alterar a sua palavra-passe, utilize a página «A minha conta»." };
  const temp = temporaryPassword();
  const hash = await hashPassword(temp);
  try {
    await asUser(user, (tx) => tx`select app.auth_set_password(${id}::uuid, ${hash}, null)`);
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
  return { status: "success", message: `Palavra-passe reposta. Palavra-passe temporária: ${temp}. As sessões abertas desta conta foram terminadas.` };
}
