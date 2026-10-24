import "server-only";
import type { Metadata } from "next";
import { env } from "./env";
import { SITE_NAME } from "./constants";

export function absoluteUrl(path: string) {
  return `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "book" | "profile";
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: type === "book" ? "book" : type === "profile" ? "profile" : type === "article" ? "article" : "website",
      siteName: SITE_NAME,
      locale: "pt_PT",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function truncate(text: string | null | undefined, max = 160) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}...`;
}

/** Serializa dados estruturados JSON-LD sem permitir a quebra do elemento script. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
