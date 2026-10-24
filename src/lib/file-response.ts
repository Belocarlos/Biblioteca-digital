import "server-only";
import { storage } from "./storage";

function contentDisposition(type: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseRange(header: string | null, size: number) {
  if (!header) return null;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return null;
  let start: number;
  let end: number;
  if (m[1] === "" && m[2] !== "") {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (Number.isNaN(start) || start > end || start >= size) return "invalid" as const;
  return { start, end };
}

/** Devolve um ficheiro armazenado com suporte para pedidos parciais (Range). */
export async function fileResponse(
  request: Request,
  key: string,
  options: { filename: string; contentType: string; disposition: "inline" | "attachment"; cacheControl: string },
) {
  const size = await storage().size(key);
  if (size === null) return new Response("Ficheiro não encontrado.", { status: 404 });

  const headers = new Headers({
    "Content-Type": options.contentType,
    "Content-Disposition": contentDisposition(options.disposition, options.filename),
    "Cache-Control": options.cacheControl,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  if (process.env.SITE_INDEXING !== "true") headers.set("X-Robots-Tag", "noindex, nofollow");

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const obj = await storage().get(key, range ?? undefined);
  if (!obj) return new Response("Ficheiro não encontrado.", { status: 404 });
  if (range && obj.range) {
    headers.set("Content-Range", `bytes ${obj.range.start}-${obj.range.end}/${size}`);
    headers.set("Content-Length", String(obj.range.end - obj.range.start + 1));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(obj.body, { status: 200, headers });
}

export function pdfFileName(slug: string) {
  return `${slug.slice(0, 100)}.pdf`;
}
