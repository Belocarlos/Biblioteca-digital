/**
 * Aplica as migrações SQL em db/migrations por ordem alfabética.
 *
 * Utiliza MIGRATION_DATABASE_URL (papel proprietário do esquema).
 * Se APP_DB_PASSWORD estiver definida, ativa o LOGIN do papel ol4_app
 * com essa palavra-passe.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    throw new Error("MIGRATION_DATABASE_URL não está definida.");
  }
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`
      create table if not exists public.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`;
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set(
      (await sql<{ name: string }[]>`select name from public.schema_migrations`).map((r) => r.name),
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = await readFile(path.join(dir, file), "utf8");
      process.stdout.write(`A aplicar ${file}... `);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into public.schema_migrations (name) values (${file})`;
      });
      process.stdout.write("concluído\n");
    }
    await sql`revoke all on public.schema_migrations from ol4_app`;

    const appPassword = process.env.APP_DB_PASSWORD;
    if (appPassword) {
      await sql.unsafe(`alter role ol4_app with login password ${quoteLiteral(appPassword)}`);
      console.log("Papel ol4_app ativado para autenticação.");
    }
    console.log("Base de dados atualizada.");
  } finally {
    await sql.end();
  }
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
