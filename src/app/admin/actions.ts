"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { asUser, createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { clientIpHash } from "@/lib/security";
import { str, type FormState } from "@/lib/form-utils";

const MAX_FAILURES = 5;
const WINDOW = "15 minutes";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email").toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";
  const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).safeParse({ email, password });
  if (!parsed.success) {
    return { status: "error", message: "Indique o e-mail e a palavra-passe.", data: { email } };
  }

  const ipHash = await clientIpHash();
  const [{ failures }] = await sql<{ failures: number }[]>`
    select app.auth_recent_failures(${email}, ${ipHash}, ${WINDOW}::interval) as failures`;
  if (failures >= MAX_FAILURES) {
    return { status: "error", message: "Demasiadas tentativas sem sucesso. Aguarde 15 minutos antes de tentar novamente.", data: { email } };
  }

  const rows = await sql<{ user_id: string; password_hash: string; is_active: boolean }[]>`
    select * from app.auth_get_credentials(${email})`;
  const account = rows[0];
  const valid = await verifyPassword(account?.password_hash ?? null, password);
  await sql`select app.auth_record_attempt(${email}, ${ipHash}, ${valid && !!account?.is_active})`;

  if (!account || !valid || !account.is_active) {
    // Mensagem genérica: não revela se o e-mail existe ou se a conta está inativa.
    return { status: "error", message: "E-mail ou palavra-passe incorretos.", data: { email } };
  }

  await createSession(account.user_id, ipHash);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/entrar");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/entrar");
  const current = (formData.get("current") as string | null) ?? "";
  const next = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";

  const errors: Record<string, string[]> = {};
  const problem = passwordProblems(next);
  if (problem) errors.password = [problem];
  if (next !== confirm) errors.confirm = ["As palavras-passe não coincidem."];
  if (next && next === current) errors.password = ["A nova palavra-passe deve ser diferente da atual."];
  if (Object.keys(errors).length) return { status: "error", message: "Verifique os campos assinalados.", errors };

  const rows = await sql<{ password_hash: string }[]>`select password_hash from app.auth_get_credentials(${user.email})`;
  if (!(await verifyPassword(rows[0]?.password_hash ?? null, current))) {
    return { status: "error", message: "A palavra-passe atual está incorreta.", errors: { current: ["Palavra-passe incorreta."] } };
  }
  const hash = await hashPassword(next);
  await asUser(user, (tx) => tx`select app.auth_set_password(${user.id}::uuid, ${hash}, decode(${user.tokenHash}, 'hex'))`);
  redirect("/admin?ok=palavra");
}
