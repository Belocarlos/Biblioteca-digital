import "server-only";
import type { Tx } from "./db";
import { slugify } from "./slug";

/** Gera um slug único na tabela indicada, acrescentando um sufixo numérico quando necessário. */
export async function uniqueSlug(tx: Tx, table: "resources" | "program_sessions" | "authors" | "collections", base: string, excludeId?: string) {
  const root = slugify(base);
  const rows = await tx<{ slug: string }[]>`
    select slug from ${tx(table)}
    where (slug = ${root} or slug like ${`${root}-%`})
      ${excludeId ? tx`and id <> ${excludeId}` : tx``}`;
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function uuidList(values: string[]) {
  return Array.from(new Set(values.filter((v) => UUID_RE.test(v))));
}
