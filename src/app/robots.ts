import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { env } from "@/lib/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  // No ambiente de testes, todo o website fica excluído dos motores de pesquisa.
  if (!env.indexingEnabled) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin", "/biblioteca/*/leitor"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}
