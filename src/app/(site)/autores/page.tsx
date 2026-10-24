import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { AuthorCard } from "@/components/site/author-card";
import { getAuthorAreas, getAuthors } from "@/lib/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Autores e oradores",
  description: "Diretório das pessoas que contribuem com conhecimento para o programa Open Lecture4All: autores das publicações e oradores das sessões Saberes em Rede.",
  path: "/autores",
});

export default async function AuthorsPage({ searchParams }: PageProps<"/autores">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const area = typeof sp.area === "string" ? sp.area.slice(0, 160) : "";
  const [authors, areas] = await Promise.all([getAuthors(q || undefined, area || undefined), getAuthorAreas()]);
  const filtered = !!q || !!area;

  return (
    <>
      <PageHeader
        eyebrow="Diretório"
        title="Autores e oradores"
        crumbs={[{ href: "/", label: "Início" }, { label: "Autores" }]}
        description="Pessoas que contribuem com conhecimento para o programa, como autores das publicações da biblioteca ou oradores das sessões Saberes em Rede. Os perfis são publicados com autorização dos próprios."
      />
      <div className="container-page py-10">
        <form action="/autores" method="get" role="search" className="mb-8 grid gap-3 border-b border-line pb-6 sm:grid-cols-[1fr_16rem_auto] sm:items-end">
          <div>
            <label htmlFor="autores-q" className="mb-1.5 block text-sm font-medium text-ink-strong">
              Nome ou instituição
            </label>
            <input id="autores-q" name="q" type="search" defaultValue={q} placeholder="Pesquisar por nome" className="h-10 w-full rounded-md border border-line-strong px-3 text-sm focus:border-brand-blue" />
          </div>
          <div>
            <label htmlFor="autores-area" className="mb-1.5 block text-sm font-medium text-ink-strong">
              Área de especialização
            </label>
            <select id="autores-area" name="area" defaultValue={area} className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-sm focus:border-brand-blue">
              <option value="">Todas as áreas</option>
              {areas.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.value} ({a.count})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-10 rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
              Pesquisar
            </button>
            {filtered ? (
              <Link href="/autores" className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        {authors.length ? (
          <>
            <p className="mb-4 text-sm text-muted" aria-live="polite">
              {authors.length} {authors.length === 1 ? "perfil" : "perfis"}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {authors.map((a) => (
                <li key={a.id}>
                  <AuthorCard author={a} />
                </li>
              ))}
            </ul>
          </>
        ) : filtered ? (
          <EmptyState icon={<Users />} title="Não foram encontrados perfis para os critérios selecionados." action={<Link href="/autores" className="link text-sm">Ver todos os perfis</Link>} />
        ) : (
          <EmptyState icon={<Users />} title="Ainda não existem perfis publicados">
            Os perfis de autores e oradores serão apresentados nesta secção após autorização dos próprios.
          </EmptyState>
        )}
      </div>
    </>
  );
}
