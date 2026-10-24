/**
 * Aplica os prazos de conservação definidos na Política de Privacidade.
 *
 * - Submissões recusadas: eliminadas 12 meses após a recusa (incluindo o ficheiro).
 * - Tentativas de autenticação: 90 dias.
 * - Registos de limitação de pedidos: 2 dias.
 * - Sessões expiradas.
 *
 * Utilização: npm run maintenance:retention
 * Recomenda-se agendar a execução diária no alojamento (cron).
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function deleteFile(key: string) {
  if (!/^(documents|images|submissions)\/[0-9]{4}\/[0-9a-f-]{36}\.(pdf|webp)$/.test(key)) return;
  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: process.env.S3_ACCESS_KEY_ID
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
        : undefined,
    });
    await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  } else {
    await rm(path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage", key), { force: true });
  }
}

async function main() {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL não está definida.");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const rejected = await sql<{ id: string; file_key: string | null; reference_code: string }[]>`
      select s.id, s.file_key, s.reference_code from public.submissions s
      where s.status = 'rejected' and s.resource_id is null
        and (select max(e.created_at) from public.submission_events e
             where e.submission_id = s.id and e.to_status = 'rejected') < now() - interval '12 months'`;
    for (const s of rejected) {
      await sql.begin(async (tx) => {
        await tx`delete from public.submissions where id = ${s.id}`;
        await tx`insert into public.audit_log (action, entity_type, entity_id, details)
                 values ('retention.submission_deleted', 'submissions', ${s.id}, ${tx.json({ reference: s.reference_code })})`;
      });
      if (s.file_key) await deleteFile(s.file_key);
    }
    const [{ count: attempts }] = await sql<{ count: number }[]>`
      with d as (delete from private.login_attempts where created_at < now() - interval '90 days' returning 1) select count(*)::int as count from d`;
    const [{ count: rate }] = await sql<{ count: number }[]>`
      with d as (delete from private.rate_events where created_at < now() - interval '2 days' returning 1) select count(*)::int as count from d`;
    const [{ count: sessions }] = await sql<{ count: number }[]>`
      with d as (delete from private.sessions where expires_at < now() returning 1) select count(*)::int as count from d`;
    console.log(`Submissões recusadas eliminadas: ${rejected.length}`);
    console.log(`Tentativas de autenticação eliminadas: ${attempts}`);
    console.log(`Registos de limitação eliminados: ${rate}`);
    console.log(`Sessões expiradas eliminadas: ${sessions}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
