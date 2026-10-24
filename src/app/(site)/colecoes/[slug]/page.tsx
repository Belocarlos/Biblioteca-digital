import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { ResourceGrid } from "@/components/site/resource-card";
import { getCollectionBySlug, searchCatalog } from "@/lib/queries/public";
import { pageMetadata, truncate } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/colecoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Coleção não encontrada", robots: { index: false } };
  return pageMetadata({ title: c.name, description: truncate(c.description) || `Coleção temática ${c.name}.`, path: `/colecoes/${c.slug}` });
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/colecoes/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const page = typeof sp.pagina === "string" && /^\d{1,4}$/.test(sp.pagina) ? Number(sp.pagina) : 1;
  const result = await searchCatalog({ collection: collection.slug, page, perPage: 16 });

  return (
    <>
      <PageHeader
        eyebrow="Coleção temática"
        title={collection.name}
        crumbs={[{ href: "/", label: "Início" }, { href: "/colecoes", label: "Coleções" }, { label: collection.name }]}
        description={collection.description}
      >
        {result.total > 0 ? (
          <p className="mt-4 text-sm font-medium text-brand-green">
            {result.total} {result.total === 1 ? "recurso publicado" : "recursos publicados"}
          </p>
        ) : null}
      </PageHeader>
      <div className="container-page py-10">
        {result.rows.length ? (
          <>
            <div className="mb-6 flex justify-end">
              <LinkButton href={`/biblioteca?colecao=${collection.slug}`} variant="secondary" size="sm">
                Pesquisar e filtrar nesta coleção
              </LinkButton>
            </div>
            <ResourceGrid resources={result.rows} />
            <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => `/colecoes/${collection.slug}${p > 1 ? `?pagina=${p}` : ""}`} />
          </>
        ) : (
          <EmptyState icon={<BookOpen />} title="Esta coleção ainda não tem recursos publicados" action={<LinkButton href="/colecoes" variant="secondary">Ver outras coleções</LinkButton>}>
            Os materiais desta coleção serão disponibilizados após validação editorial.
          </EmptyState>
        )}
      </div>
    </>
  );
}
