import { asUser, getCurrentUser } from "@/lib/auth/session";
import { fileResponse } from "@/lib/file-response";

const UUID = /^[0-9a-f-]{36}$/;

/** Ficheiro submetido: acesso exclusivo da equipa editorial (validado pela RLS). */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/submissoes/[id]/ficheiro">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Autenticação necessária.", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Pedido inválido.", { status: 400 });
  const rows = await asUser(user, (tx) =>
    tx<{ file_key: string | null; file_name: string | null; reference_code: string }[]>`
      select file_key, file_name, reference_code from submissions where id = ${id}`,
  );
  const row = rows[0];
  if (!row?.file_key) return new Response("Ficheiro não encontrado.", { status: 404 });
  return fileResponse(request, row.file_key, {
    filename: row.file_name ?? `${row.reference_code}.pdf`,
    contentType: "application/pdf",
    disposition: "attachment",
    cacheControl: "private, no-store",
  });
}
