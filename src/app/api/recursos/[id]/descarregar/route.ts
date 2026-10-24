import { after } from "next/server";
import { getResourceFileInfo, trackResourceEvent } from "@/lib/queries/public";
import { fileResponse, pdfFileName } from "@/lib/file-response";

const UUID = /^[0-9a-f-]{36}$/;

export async function GET(request: Request, ctx: RouteContext<"/api/recursos/[id]/descarregar">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Pedido inválido.", { status: 400 });
  const info = await getResourceFileInfo(id);
  // O descarregamento só é permitido quando a licença ou a autorização o preveem.
  if (!info || !info.file_key || !info.allow_download) {
    return new Response("Documento não disponível para descarregamento.", { status: 404 });
  }
  if (!request.headers.get("range")) after(() => trackResourceEvent(info.id, "download"));
  return fileResponse(request, info.file_key, {
    filename: pdfFileName(info.slug),
    contentType: "application/pdf",
    disposition: "attachment",
    cacheControl: "public, max-age=300",
  });
}
