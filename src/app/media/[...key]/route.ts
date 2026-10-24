import { fileResponse } from "@/lib/file-response";

const IMAGE_KEY = /^images\/[0-9]{4}\/[0-9a-f-]{36}\.webp$/;

/**
 * Imagens públicas (capas, cartazes, fotografias autorizadas e logótipos).
 * Os nomes são aleatórios e as imagens são recodificadas no carregamento.
 */
export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  if (!IMAGE_KEY.test(joined)) return new Response("Não encontrado.", { status: 404 });
  return fileResponse(request, joined, {
    filename: key.at(-1)!,
    contentType: "image/webp",
    disposition: "inline",
    cacheControl: "public, max-age=31536000, immutable",
  });
}
