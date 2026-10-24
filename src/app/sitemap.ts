import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = env.siteUrl;
  const staticPages = ["", "/biblioteca", "/sessoes", "/autores", "/colecoes", "/sobre", "/contactos", "/submeter", "/politica-de-privacidade", "/termos-e-condicoes"];
  const [resources, sessions, authors, collections] = await Promise.all([
    sql<{ slug: string; updated_at: Date }[]>`select slug, updated_at from resources where status = 'published'`,
    sql<{ slug: string; updated_at: Date }[]>`select slug, updated_at from program_sessions where status = 'published'`,
    sql<{ slug: string; updated_at: Date }[]>`select slug, updated_at from authors where is_published`,
    sql<{ slug: string; updated_at: Date }[]>`select slug, updated_at from collections where is_published`,
  ]);
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...resources.map((r) => ({ url: `${base}/biblioteca/${r.slug}`, lastModified: r.updated_at, priority: 0.8 })),
    ...sessions.map((r) => ({ url: `${base}/sessoes/${r.slug}`, lastModified: r.updated_at, priority: 0.6 })),
    ...authors.map((r) => ({ url: `${base}/autores/${r.slug}`, lastModified: r.updated_at, priority: 0.5 })),
    ...collections.map((r) => ({ url: `${base}/colecoes/${r.slug}`, lastModified: r.updated_at, priority: 0.6 })),
  ];
}
