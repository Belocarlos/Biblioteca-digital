import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Layers, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { ResourceGrid } from "@/components/site/resource-card";
import { SessionCard } from "@/components/site/session-card";
import { Cover } from "@/components/site/cover";
import { TypeIcon } from "@/components/site/type-icon";
import { RESOURCE_TYPES, RESOURCE_TYPE_PLURAL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { getCollections, getFeaturedSessions, getPublicStats, getRecentResources, getSettings } from "@/lib/queries/public";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { SITE_NAME } from "@/lib/constants";

export default async function HomePage() {
  const [stats, collections, recent, sessions, settings] = await Promise.all([
    getPublicStats(),
    getCollections(),
    getRecentResources(6),
    getFeaturedSessions(3),
    getSettings(),
  ]);

  const indicators = [
    { value: stats.resources, singular: "recurso publicado", plural: "recursos publicados", href: "/biblioteca" },
    { value: stats.sessions, singular: "sessão documentada", plural: "sessões documentadas", href: "/sessoes" },
    { value: stats.authors, singular: "autor registado", plural: "autores registados", href: "/autores" },
  ].filter((i) => i.value > 0);

  const covers = recent.filter((r) => r.cover_key).slice(0, 3);

  const structured = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "pt",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/biblioteca")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />

      <section aria-labelledby="titulo-principal" className="border-b border-line bg-surface">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-12 lg:items-center lg:py-16">
          <div className="lg:col-span-7">
            <p className="eyebrow">Repositório do programa Open Lecture4All</p>
            <h1 id="titulo-principal" className="mt-3 text-4xl font-semibold sm:text-[2.75rem]">
              Biblioteca Digital Open Lecture4All
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink">
              Consulte livros, artigos científicos, apresentações, gravações de sessões e outros materiais educativos associados ao Open
              Lecture4All. Explore recursos organizados por temas, autores e áreas de conhecimento.
            </p>

            <form action="/biblioteca" method="get" role="search" className="mt-8 max-w-2xl">
              <label htmlFor="home-q" className="mb-2 block text-sm font-medium text-ink-strong">
                Pesquisar no acervo
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                  <input
                    id="home-q"
                    name="q"
                    type="search"
                    placeholder="Pesquisar livros, artigos, autores ou temas..."
                    className="h-12 w-full rounded-md border border-line-strong bg-white pl-11 pr-3 text-base placeholder:text-muted focus:border-brand-blue"
                  />
                </div>
                <button type="submit" className="h-12 rounded-md bg-brand-blue px-6 text-base font-medium text-white hover:bg-brand-blue-dark">
                  Pesquisar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/biblioteca" variant="green" size="lg">
                <BookOpen aria-hidden="true" className="h-5 w-5" />
                Explorar biblioteca
              </LinkButton>
              <LinkButton href="/sessoes" variant="secondary" size="lg">
                <CalendarDays aria-hidden="true" className="h-5 w-5" />
                Consultar sessões
              </LinkButton>
            </div>
          </div>

          <div className="lg:col-span-5">
            {covers.length > 0 ? (
              <figure className="rounded-lg border border-line bg-white p-6">
                <div className="grid grid-cols-3 items-end gap-4">
                  {covers.map((r, i) => (
                    <Link key={r.id} href={`/biblioteca/${r.slug}`} className={i === 1 ? "-translate-y-3" : ""} aria-label={r.title}>
                      <Cover coverKey={r.cover_key} title={r.title} type={r.resource_type} size="sm" priority />
                    </Link>
                  ))}
                </div>
                <figcaption className="mt-5 border-t border-line pt-3 text-sm text-muted">Publicações adicionadas recentemente ao acervo.</figcaption>
              </figure>
            ) : (
              <div className="rounded-lg border border-line bg-white">
                <p className="border-b border-line px-5 py-3 text-sm font-semibold text-brand-blue">Tipos de materiais no acervo</p>
                <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                  {RESOURCE_TYPES.map((type) => (
                    <li key={type} className="sm:border-b sm:border-line sm:odd:border-r sm:last:col-span-2 sm:last:border-b-0 sm:last:border-r-0">
                      <Link
                        href={`/biblioteca?tipo=${type}`}
                        className="flex items-center gap-3 px-5 py-3 text-sm text-ink hover:bg-brand-blue-50 hover:text-brand-blue"
                      >
                        <TypeIcon type={type} className="h-4 w-4 shrink-0 text-brand-green" />
                        {RESOURCE_TYPE_PLURAL[type]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {indicators.length > 0 ? (
          <div className="border-t border-line bg-white">
            <dl aria-label="Indicadores da biblioteca" className="container-page grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {indicators.map((i) => (
                <div key={i.plural} className="flex items-baseline gap-3 py-5 sm:px-6 sm:first:pl-0">
                  <dt className="sr-only">{i.plural}</dt>
                  <dd className="font-heading text-3xl font-semibold text-brand-blue">{formatNumber(i.value)}</dd>
                  <dd>
                    <Link href={i.href} className="text-sm text-ink hover:text-brand-blue hover:underline">
                      {i.value === 1 ? i.singular : i.plural}
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="titulo-colecoes" className="container-page pt-14">
        <SectionHeading
          id="titulo-colecoes"
          title="Coleções temáticas"
          description="Os recursos estão organizados nas principais áreas de atuação do programa."
          action={
            <Link href="/colecoes" className="link inline-flex items-center gap-1 text-sm font-medium">
              Todas as coleções <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/colecoes/${c.slug}`}
                className="group flex h-full flex-col rounded-md border border-line bg-white p-5 transition-colors hover:border-brand-blue"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-heading text-lg font-semibold leading-snug text-brand-blue group-hover:underline">{c.name}</span>
                  <Layers aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-teal" />
                </span>
                {c.description ? <span className="mt-2 text-sm leading-relaxed text-ink">{c.description}</span> : null}
                {c.count > 0 ? (
                  <span className="mt-auto pt-4 text-xs font-medium text-brand-green">
                    {c.count} {c.count === 1 ? "recurso" : "recursos"}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-recentes" className="container-page pt-16">
        <SectionHeading
          id="titulo-recentes"
          title="Recursos recentes"
          description="Últimas publicações disponibilizadas após validação editorial."
          action={
            recent.length > 0 ? (
              <Link href="/biblioteca?ordem=recentes" className="link inline-flex items-center gap-1 text-sm font-medium">
                Ver catálogo completo <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        {recent.length > 0 ? (
          <ResourceGrid resources={recent} />
        ) : (
          <EmptyState icon={<BookOpen />} title="Ainda não existem recursos publicados">
            Os materiais da biblioteca serão disponibilizados nesta secção após validação editorial.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="titulo-sessoes" className="container-page pt-16">
        <SectionHeading
          id="titulo-sessoes"
          title="Sessões Saberes em Rede"
          description="Encontros de diálogo interdisciplinar promovidos pelo Open Lecture4All."
          action={
            sessions.length > 0 ? (
              <Link href="/sessoes" className="link inline-flex items-center gap-1 text-sm font-medium">
                Arquivo de sessões <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        {sessions.length > 0 ? (
          <ul className="grid gap-5 lg:grid-cols-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarDays />} title="Ainda não existem sessões publicadas">
            As sessões do programa e os respetivos materiais serão apresentados nesta secção após verificação da informação.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="titulo-iniciativa" className="container-page pt-16">
        <div className="grid gap-8 rounded-lg border border-line bg-white p-6 sm:p-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow">Sobre a iniciativa</p>
            <h2 id="titulo-iniciativa" className="mt-2 text-2xl font-semibold">
              O programa Open Lecture4All
            </h2>
            <p className="mt-4 leading-relaxed text-ink">{settings.home_about}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 border-t border-line pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <LinkButton href="/sobre" variant="primary">
              Conhecer o programa
            </LinkButton>
            <LinkButton href="/submeter" variant="secondary">
              Submeter material
            </LinkButton>
            <p className="text-xs leading-relaxed text-muted">
              Investigadores e oradores podem propor a inclusão de documentos. As propostas são analisadas pela equipa editorial antes da publicação.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
