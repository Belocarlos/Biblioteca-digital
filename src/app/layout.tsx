import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-sans-3";
import "./globals.css";
import { env } from "@/lib/env";
import { SITE_NAME, SLOGAN } from "@/lib/constants";
import { getSettings } from "@/lib/queries/public";

export async function generateMetadata(): Promise<Metadata> {
  let ogImage: string | undefined;
  try {
    const settings = await getSettings();
    if (settings.og_image_key) ogImage = `/media/${settings.og_image_key}`;
  } catch {
    // A ausência de ligação à base de dados não deve impedir a geração de metadados.
  }
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description:
      "Repositório digital do programa Open Lecture4All: livros, artigos científicos, apresentações, gravações das sessões Saberes em Rede e materiais educativos.",
    applicationName: SITE_NAME,
    robots: env.indexingEnabled ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
    openGraph: {
      siteName: SITE_NAME,
      locale: "pt_PT",
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    other: { "format-detection": "telephone=no" },
    keywords: ["biblioteca digital", "Open Lecture4All", "Saberes em Rede", "repositório", "conhecimento aberto", SLOGAN],
  };
}

export const viewport: Viewport = {
  themeColor: "#163A5F",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Todas as páginas são geradas no momento do pedido, com dados atuais da base de dados
  // e um nonce de CSP único por pedido.
  await connection();
  return (
    <html lang="pt-PT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
