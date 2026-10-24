import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";
import { E2E_ENV } from "../playwright.config";
import { USERS } from "./fixtures";

/** Recria a base de dados de testes, aplica as migrações e cria as contas de teste. */
export default async function globalSetup() {
  const sql = postgres(E2E_ENV.MIGRATION_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    // Remove todos os objetos do proprietário nesta base de dados de testes.
    const [{ current_user: owner }] = await sql<{ current_user: string }[]>`select current_user`;
    await sql.unsafe(`drop owned by "${owner}" cascade`);
  } finally {
    await sql.end();
  }
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env: { ...process.env, ...E2E_ENV }, stdio: "inherit" });
  await rm(E2E_ENV.STORAGE_LOCAL_DIR, { recursive: true, force: true });

  const db = postgres(E2E_ENV.MIGRATION_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    for (const u of Object.values(USERS)) {
      const passwordHash = await hash(u.password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
      const [row] = await db<{ id: string }[]>`
        insert into public.users (email, name, role, must_change_password) values (${u.email}, ${u.name}, ${u.role}, false) returning id`;
      await db`insert into private.credentials (user_id, password_hash) values (${row!.id}, ${passwordHash})`;
    }
  } finally {
    await db.end();
  }
}
