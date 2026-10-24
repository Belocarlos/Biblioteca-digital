import "server-only";
import postgres from "postgres";
import { env } from "./env";

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;
export type Db = Sql | Tx;

const globalForDb = globalThis as unknown as { __ol4Sql?: Sql };

function createClient(): Sql {
  return postgres(env.databaseUrl ?? "", {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
    transform: { undefined: null },
  });
}

/** Cliente partilhado. Sem contexto de sessão, as consultas são feitas como visitante anónimo. */
export function getSql(): Sql {
  if (!globalForDb.__ol4Sql) {
    globalForDb.__ol4Sql = createClient();
  }
  return globalForDb.__ol4Sql;
}

export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const client = getSql() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

/**
 * Executa uma transação com o contexto de sessão do utilizador autenticado.
 * A base de dados obtém a função do utilizador a partir do hash do token e
 * aplica as políticas de RLS correspondentes.
 */
export async function withSession<T>(
  tokenHash: string,
  fn: (tx: Tx) => Promise<T>,
  options: { note?: string | null } = {},
): Promise<T> {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw new Error("Token de sessão inválido.");
  }
  const result = await getSql().begin(async (tx) => {
    await tx`select set_config('app.session', ${tokenHash}, true)`;
    if (options.note) {
      await tx`select set_config('app.editorial_note', ${options.note.slice(0, 1000)}, true)`;
    }
    return fn(tx);
  });
  return result as T;
}

/** Traduz erros da base de dados em mensagens apresentáveis. */
export function dbErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string; constraint_name?: string };
  if (err?.code === "42501") {
    if (err.message?.includes("row-level security")) {
      return "Não tem permissão para realizar esta operação.";
    }
    return err.message ?? "Não tem permissão para realizar esta operação.";
  }
  if (err?.code === "23505") {
    if (err.constraint_name?.includes("slug")) return "Já existe um registo com este endereço (slug).";
    if (err.constraint_name?.includes("email")) return "Já existe uma conta com este endereço de e-mail.";
    return "Já existe um registo com estes dados.";
  }
  if (err?.code === "23503") {
    return "O registo está associado a outros conteúdos e não pode ser eliminado.";
  }
  if (err?.code === "23514") {
    return `Os dados não cumprem as regras de validação (${err.constraint_name ?? "restrição"}).`;
  }
  console.error(error);
  return "Ocorreu um erro inesperado. Tente novamente.";
}
