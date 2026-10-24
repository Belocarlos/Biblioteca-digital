/**
 * Cria (ou reativa) uma conta de administrador.
 *
 * Utilização:
 *   npm run admin:create -- --email pessoa@exemplo.org --name "Nome Apelido"
 *
 * É gerada uma palavra-passe temporária, apresentada uma única vez.
 * A alteração é obrigatória no primeiro acesso.
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length < 2) {
    console.error('Utilização: npm run admin:create -- --email pessoa@exemplo.org --name "Nome Apelido"');
    process.exit(1);
  }
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL não está definida.");

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const temp = `${Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("")}-${randomBytes(2).toString("hex")}A7`;
  const passwordHash = await hash(temp, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into public.users (email, name, role, is_active, must_change_password)
        values (${email}, ${name}, 'admin', true, true)
        on conflict (email) do update set role = 'admin', is_active = true, must_change_password = true, name = excluded.name
        returning id`;
      await tx`
        insert into private.credentials (user_id, password_hash) values (${user!.id}, ${passwordHash})
        on conflict (user_id) do update set password_hash = excluded.password_hash, updated_at = now()`;
      await tx`delete from private.sessions where user_id = ${user!.id}`;
      await tx`
        insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
        values (null, 'cli.admin_created', 'users', ${user!.id}, ${tx.json({ email })})`;
    });
    console.log(`Administrador ${email} criado ou reativado.`);
    console.log(`Palavra-passe temporária (apresentada apenas agora): ${temp}`);
    console.log("A alteração da palavra-passe é obrigatória no primeiro acesso.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
