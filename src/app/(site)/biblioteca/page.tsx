import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileSearch, SlidersHorizontal, X } from "lucide-react";
import { PageHeader, EmptyState, Pagination } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { ResourceGrid } from "@/components/site/resource-card";
import { RESOURCE_TYPES, RESOURCE_TYPE_PLURAL, languageLabel } from "@/lib/constants";
import { getCatalogFacets, searchCatalog, SEARCH_FIELDS, SEARCH_FIELD_LABELS, SORT_OPTIONS, SORT_LABELS } from "@/lib/queries/public";
import { catalogQueryString, parseCatalogParams } from "@/lib/catalog-params";
import { formatNumber } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: PageProps<"/biblioteca">): Promise<Metadata> {
  const sp = await searchParams;
  const base = pageMetadata({
    title: "Biblioteca",
    description: "Catálogo da Biblioteca Digital Open Lecture4All. Pesquise livros, artigos científicos, apresentações, relatórios e gravações por título, autor, tema, ano, idioma e país.",
    path: "/biblioteca",
  });
  // As páginas de resultados filtrados não são indexadas, para evitar conteúdo duplicado.
  if (Object.keys(sp).length > 0) return { ...base, robots: { index: false, follow: true } };
  return base;
}

const selectCls =
  "h-10 w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink-strong focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";

export default async function CatalogPage({ searchParams }: PageProps<"/biblioteca">) {
  const params = parseCatalogParams(await searchParams);
  const [result, facets] = await Promise.all([searchCatalog(params), getCatalogFacets()]);
  const typeCounts = new Map(facets.types.map((t) => [t.value, t.count]));
  const totalPublished = facets.types.reduce((sum, t) => sum + t.count, 0);

  const active: { label: string; href: string }[] = [];
  if (params.q) active.push({ label: `Pesquisa: "${params.q}"${params.field !== "todos" ? ` em ${SEARCH_FIELD_LABELS[params.field!].toLowerCase()}` : ""}`, href: `/biblioteca${catalogQueryString(params, { q: undefined, page: 1 })}` });
  for (const t of params.types ?? []) active.push({ label: RESOURCE_TYPE_PLURAL[t], href: `/biblioteca${catalogQueryString(params, { types: params.types!.filter((x) => x !== t), page: 1 })}` });
  if (params.collection) active.push({ label: facets.collections.find((c) => c.value === params.collection)?.label ?? params.collection, href: `/biblioteca${catalogQueryString(params, { collection: undefined, page: 1 })}` });
  if (params.yearFrom) active.push({ label: `Desde ${params.yearFrom}`, href: `/biblioteca${catalogQueryString(params, { yearFrom: undefined, page: 1 })}` });
  if (params.yearTo) active.push({ label: `Até ${params.yearTo}`, href: `/biblioteca${catalogQueryString(params, { yearTo: undefined, page: 1 })}` });
  if (params.language) active.push({ label: languageLabel(params.language), href: `/biblioteca${catalogQueryString(params, { language: undefined, page: 1 })}` });
  if (params.country) active.push({ label: params.country, href: `/biblioteca${catalogQueryString(params, { country: undefined, page: 1 })}` });

  const filtersApplied = active.length > 0;

  return (
    <>
      <PageHeader
        title="Biblioteca"
        crumbs={[{ href: "/", label: "Início" }, { label: "Biblioteca" }]}
        description="Consulte o catálogo de recursos do Open Lecture4All. Combine a pesquisa com filtros por tipo, área temática, ano, idioma e país."
      >
        <form action="/biblioteca" method="get" role="search" className="mt-6 grid max-w-3xl gap-2 sm:grid-cols-[1fr_12rem_auto]">
          {(params.types ?? []).map((t) => (
            <input key={t} type="hidden" name="tipo" value={t} />
          ))}
          {params.collection ? <input type="hidden" name="colecao" value={params.collection} /> : null}
          {params.language ? <input type="hidden" name="idioma" value={params.language} /> : null}
          {params.country ? <input type="hidden" name="pais" value={params.country} /> : null}
          {params.yearFrom ? <input type="hidden" name="ano_de" value={params.yearFrom} /> : null}
          {params.yearTo ? <input type="hidden" name="ano_ate" value={params.yearTo} /> : null}
          <div>
            <label htmlFor="catalog-q" className="sr-only">
              Termos de pesquisa
            </label>
            <input
              id="catalog-q"
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="Pesquisar livros, artigos, autores ou temas..."
              className="h-11 w-full rounded-md border border-line-strong bg-white px-3 text-base focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
          <div>
            <label htmlFor="catalog-campo" className="sr-only">
              Pesquisar em
            </label>
            <select id="catalog-campo" name="campo" defaultValue={params.field} className={`${selectCls} h-11`}>
              {SEARCH_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {SEARCH_FIELD_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-11 rounded-md bg-brand-blue px-5 text-sm font-medium text-white hover:bg-brand-blue-dark">
            Pesquisar
          </button>
        </form>
      </PageHeader>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[17rem_1fr]">
        <aside aria-labelledby="titulo-filtros">
          <details className="group rounded-md border border-line bg-white lg:open:border-line" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 lg:cursor-default">
              <h2 id="titulo-filtros" className="flex items-center gap-2 text-base font-semibold">
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                Filtros
              </h2>
              <span className="text-xs text-muted lg:hidden">Mostrar ou ocultar</span>
            </summary>
            <form action="/biblioteca" method="get" className="space-y-5 border-t border-line px-4 py-4">
              {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
              {params.q && params.field !== "todos" ? <input type="hidden" name="campo" value={params.field} /> : null}

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink-strong">Tipo de documento</legend>
                <div className="space-y-1.5">
                  {RESOURCE_TYPES.map((t) => {
                    const count = typeCounts.get(t) ?? 0;
                    return (
                      <label key={t} className="flex items-center gap-2.5 text-sm text-ink">
                        <input type="checkbox" name="tipo" value={t} defaultChecked={params.types?.includes(t)} className="h-4 w-4 accent-brand-blue" />
                        <span className="flex-1">{RESOURCE_TYPE_PLURAL[t]}</span>
                        {count > 0 ? <span className="text-xs text-muted">{count}</span> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="f-colecao" className="mb-1.5 block text-sm font-semibold text-ink-strong">
                  Área temática
                </label>
                <select id="f-colecao" name="colecao" defaultValue={params.collection ?? ""} className={selectCls}>
                  <option value="">Todas</option>
                  {facets.collections.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                      {c.count > 0 ? ` (${c.count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-ink-strong">Ano de publicação</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="f-ano-de" className="mb-1 block text-xs text-muted">
                      De
                    </label>
                    <input id="f-ano-de" name="ano_de" type="number" inputMode="numeric" min={1000} max={2200} defaultValue={params.yearFrom} placeholder={facets.years.min ? String(facets.years.min) : "Ano"} className={selectCls} />
                  </div>
                  <div>
                    <label htmlFor="f-ano-ate" className="mb-1 block text-xs text-muted">
                      Até
                    </label>
                    <input id="f-ano-ate" name="ano_ate" type="number" inputMode="numeric" min={1000} max={2200} defaultValue={params.yearTo} placeholder={facets.years.max ? String(facets.years.max) : "Ano"} className={selectCls} />
                  </div>
                </div>
              </fieldset>

              <div>
                <label htmlFor="f-idioma" className="mb-1.5 block text-sm font-semibold text-ink-strong">
                  Idioma
                </label>
                <select id="f-idioma" name="idioma" defaultValue={params.language ?? ""} className={selectCls}>
                  <option value="">Todos</option>
                  {facets.languages.map((l) => (
                    <option key={l.value} value={l.value}>
                      {languageLabel(l.value)} ({l.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="f-pais" className="mb-1.5 block text-sm font-semibold text-ink-strong">
                  País
                </label>
                <select id="f-pais" name="pais" defaultValue={params.country ?? ""} className={selectCls}>
                  <option value="">Todos</option>
                  {facets.countries.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.value} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="f-ordem" className="mb-1.5 block text-sm font-semibold text-ink-strong">
                  Ordenar por
                </label>
                <select id="f-ordem" name="ordem" defaultValue={result.sort} className={selectCls}>
                  {SORT_OPTIONS.filter((s) => s !== "relevancia" || params.q).map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" className="flex-1">
                  Aplicar filtros
                </Button>
                {filtersApplied ? (
                  <LinkButton href="/biblioteca" variant="secondary">
                    Limpar
                  </LinkButton>
                ) : null}
              </div>
            </form>
          </details>
        </aside>

        <section aria-labelledby="titulo-resultados">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="titulo-resultados" className="text-xl font-semibold" aria-live="polite">
              {totalPublished === 0
                ? "Catálogo"
                : `${formatNumber(result.total)} ${result.total === 1 ? "resultado" : "resultados"}`}
            </h2>
            {result.total > 0 ? (
              <p className="text-sm text-muted">
                Página {result.page} de {result.totalPages} · {SORT_LABELS[result.sort]}
              </p>
            ) : null}
          </div>

          {active.length > 0 ? (
            <ul className="mb-6 flex flex-wrap gap-2" aria-label="Filtros ativos">
              {active.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="inline-flex items-center gap-1.5 rounded-sm border border-brand-blue-100 bg-brand-blue-50 px-2.5 py-1 text-sm text-brand-blue hover:border-brand-blue">
                    {a.label}
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">(remover filtro)</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {totalPublished === 0 ? (
            <EmptyState icon={<BookOpen />} title="Biblioteca em preparação">
              Os materiais da biblioteca serão disponibilizados nesta secção após validação editorial.
            </EmptyState>
          ) : result.rows.length === 0 ? (
            <EmptyState
              icon={<FileSearch />}
              title="Não foram encontrados materiais para os critérios selecionados."
              action={
                <>
                  {filtersApplied ? <LinkButton href="/biblioteca" variant="secondary">Limpar todos os filtros</LinkButton> : null}
                  <LinkButton href="/colecoes" variant="ghost">Explorar coleções</LinkButton>
                </>
              }
            >
              <p>Sugestões para reformular a pesquisa:</p>
              <ul className="mx-auto mt-2 max-w-md list-disc space-y-1 pl-5 text-left">
                <li>verifique a ortografia dos termos pesquisados;</li>
                <li>utilize palavras mais gerais ou sinónimos;</li>
                <li>pesquise em todos os campos em vez de um campo específico;</li>
                <li>remova alguns filtros para alargar os resultados.</li>
              </ul>
            </EmptyState>
          ) : (
            <>
              <ResourceGrid resources={result.rows} narrow />
              <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => `/biblioteca${catalogQueryString(params, { page: p })}`} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
