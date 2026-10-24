import { getResourceFileInfo } from "@/lib/queries/public";
import { fileResponse, pdfFileName } from "@/lib/file-response";

const UUID = /^[0-9a-f-]{36}$/;

export async function GET(request: Request, ctx: RouteContext<"/api/recursos/[id]/pdf">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Pedido inválido.", { status: 400 });
  const info = await getResourceFileInfo(id);
  // Apenas recursos publicados com leitura online autorizada.
  if (!info || !info.file_key || !info.allow_online_reading) {
    return new Response("Documento não disponível para leitura online.", { status: 404 });
  }
  return fileResponse(request, info.file_key, {
    filename: pdfFileName(info.slug),
    contentType: "application/pdf",
    disposition: "inline",
    cacheControl: "public, max-age=300",
  });
}
