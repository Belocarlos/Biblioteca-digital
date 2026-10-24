import { asUser, getCurrentUser } from "@/lib/auth/session";
import { fileResponse, pdfFileName } from "@/lib/file-response";

const UUID = /^[0-9a-f-]{36}$/;

/** Pré-visualização do PDF de um recurso (incluindo rascunhos) pela equipa editorial. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/recursos/[id]/ficheiro">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Autenticação necessária.", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Pedido inválido.", { status: 400 });
  const rows = await asUser(user, (tx) => tx<{ slug: string; file_key: string | null }[]>`select slug, file_key from resources where id = ${id}`);
  const row = rows[0];
  if (!row?.file_key) return new Response("Ficheiro não encontrado.", { status: 404 });
  return fileResponse(request, row.file_key, {
    filename: pdfFileName(row.slug),
    contentType: "application/pdf",
    disposition: "inline",
    cacheControl: "private, no-store",
  });
}
