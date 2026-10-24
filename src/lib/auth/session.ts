import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql, withSession, type Tx } from "../db";
import { env } from "../env";
import { randomToken, sha256Hex } from "../security";
import type { UserRole } from "../constants";

export const SESSION_COOKIE = "ol4_session";
const SESSION_TTL_HOURS = 12;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
  tokenHash: string;
};

export async function createSession(userId: string, ipHash: string) {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const ua = (await headers()).get("user-agent") ?? "";
  await sql`
    select app.auth_create_session(
      ${userId}::uuid, decode(${tokenHash}, 'hex'), ${`${SESSION_TTL_HOURS} hours`}::interval,
      ${ipHash}, ${ua}
    )`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await sql`select app.auth_destroy_session(decode(${sha256Hex(token)}, 'hex'))`;
  }
  store.delete(SESSION_COOKIE);
}

/** Utilizador autenticado no pedido atual, validado na base de dados. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const tokenHash = sha256Hex(token);
  const rows = await sql<
    { user_id: string; email: string; name: string; role: UserRole; must_change_password: boolean }[]
  >`select * from app.auth_session_user(decode(${tokenHash}, 'hex'))`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: row.must_change_password,
    tokenHash,
  };
});

type GuardOptions = { allowPasswordChange?: boolean };

/** Exige sessão válida. Redireciona para a página de entrada quando não existe. */
export async function requireUser(options: GuardOptions = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/entrar");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/admin/conta?obrigatorio=1");
  return user;
}

/** Exige uma das funções indicadas. A base de dados volta a validar cada operação. */
export async function requireRole(roles: readonly UserRole[], options: GuardOptions = {}): Promise<CurrentUser> {
  const user = await requireUser(options);
  if (!roles.includes(user.role)) redirect("/admin/sem-permissao");
  return user;
}

export function hasRole(user: CurrentUser | null, roles: readonly UserRole[]) {
  return !!user && roles.includes(user.role);
}

/** Executa operações na base de dados com as permissões do utilizador. */
export function asUser<T>(user: CurrentUser, fn: (tx: Tx) => Promise<T>, options: { note?: string | null } = {}) {
  return withSession(user.tokenHash, fn, options);
}

/**
 * Para ações do servidor: devolve o utilizador ou null, sem redirecionar,
 * permitindo responder com uma mensagem de erro.
 */
export async function actionUser(roles: readonly UserRole[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !roles.includes(user.role)) return null;
  return user;
}
