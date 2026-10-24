import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getCollections } from "@/lib/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Coleções temáticas",
  description: "Coleções temáticas da Biblioteca Digital Open Lecture4All: ambiente, clima, educação, investigação, cultura, políticas públicas, tecnologia, cooperação internacional e desenvolvimento comunitário.",
  path: "/colecoes",
});

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <>
      <PageHeader
        title="Coleções temáticas"
        crumbs={[{ href: "/", label: "Início" }, { label: "Coleções" }]}
        description="Os recursos da biblioteca estão organizados em coleções que correspondem às principais áreas de atuação do programa Open Lecture4All. Um recurso pode pertencer a mais de uma coleção."
      />
      <div className="container-page py-10">
        {collections.length ? (
          <ol className="divide-y divide-line border-y border-line">
            {collections.map((c, i) => (
              <li key={c.id}>
                <Link href={`/colecoes/${c.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-6">
                  <span className="font-heading text-sm font-semibold tabular-nums text-brand-teal-dark" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-heading text-xl font-semibold text-brand-blue group-hover:underline">{c.name}</span>
                    {c.description ? <span className="mt-1.5 block max-w-3xl text-sm leading-relaxed text-ink">{c.description}</span> : null}
                  </span>
                  <span className="text-sm font-medium text-brand-green">
                    {c.count > 0 ? `${c.count} ${c.count === 1 ? "recurso" : "recursos"}` : <span className="text-muted">Sem recursos publicados</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={<Layers />} title="Ainda não existem coleções publicadas" />
        )}
      </div>
    </>
  );
}
