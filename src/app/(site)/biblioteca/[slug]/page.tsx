import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BookOpenText, CalendarDays, Download, ExternalLink, Flag, Lock } from "lucide-react";
import { Breadcrumbs, MetaList, Notice, SectionHeading } from "@/components/ui/misc";
import { LinkButton, buttonClasses } from "@/components/ui/button";
import { Cover } from "@/components/site/cover";
import { AuthorNames } from "@/components/site/author-names";
import { ResourceGrid } from "@/components/site/resource-card";
import { CitationBox } from "@/components/site/citation-box";
import { ShareButton } from "@/components/site/copy-button";
import { mediaUrl } from "@/components/site/media";
import { RESOURCE_TYPE_LABELS, formatBytes, languageLabel, licenseInfo } from "@/lib/constants";
import { abntCitation, apaCitation } from "@/lib/citation";
import { formatDate } from "@/lib/format";
import { paragraphs } from "@/lib/markdown";
import { getRelatedResources, getResourceBySlug, getSettings, trackResourceEvent } from "@/lib/queries/public";
import { absoluteUrl, jsonLd, pageMetadata, truncate } from "@/lib/seo";

const SCHEMA_TYPES: Record<string, string> = {
  book: "Book",
  article: "ScholarlyArticle",
  thesis: "Thesis",
  presentation: "PresentationDigitalDocument",
  report: "Report",
  guide: "Book",
  recording: "VideoObject",
  supplementary: "CreativeWork",
  institutional: "CreativeWork",
};

export async function generateMetadata({ params }: PageProps<"/biblioteca/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getResourceBySlug(slug);
  if (!r) return { title: "Recurso não encontrado", robots: { index: false } };
  const base = pageMetadata({
    title: r.title,
    description: truncate(r.abstract) || `${RESOURCE_TYPE_LABELS[r.resource_type]} disponível na Biblioteca Digital Open Lecture4All.`,
    path: `/biblioteca/${r.slug}`,
    image: mediaUrl(r.cover_key),
    type: r.resource_type === "book" ? "book" : "article",
  });
  // Metadados Highwire Press utilizados por indexadores académicos (por exemplo, Google Académico).
  const citation: Record<string, string | string[]> = {
    citation_title: r.title,
    citation_author: r.authors.map((a) => a.sort_name || a.name),
    citation_language: r.language,
  };
  if (r.publication_year) citation.citation_publication_date = String(r.publication_year);
  if (r.publisher) citation.citation_publisher = r.publisher;
  if (r.doi) citation.citation_doi = r.doi;
  if (r.isbn) citation.citation_isbn = r.isbn;
  if (r.allow_download && r.file_key) citation.citation_pdf_url = absoluteUrl(`/api/recursos/${r.id}/descarregar`);
  return { ...base, other: citation };
}

export default async function ResourcePage({ params }: PageProps<"/biblioteca/[slug]">) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource) notFound();

  const [related, settings] = await Promise.all([getRelatedResources(resource.id, 4), getSettings()]);
  after(() => trackResourceEvent(resource.id, "view"));

  const permanentUrl = absoluteUrl(`/biblioteca/${resource.slug}`);
  const license = licenseInfo(resource.license);
  const canRead = resource.allow_online_reading && !!resource.file_key;
  const canDownload = resource.allow_download && !!resource.file_key;
  const citationInput = {
    title: resource.title,
    subtitle: resource.subtitle,
    authors: resource.authors.map((a) => ({ name: a.name, sortName: a.sort_name })),
    year: resource.publication_year,
    type: resource.resource_type,
    publisher: resource.publisher,
    doi: resource.doi,
    isbn: resource.isbn,
    url: permanentUrl,
  };
  const reportHref = `mailto:${settings.contact_email}?subject=${encodeURIComponent(`Denúncia de conteúdo: ${resource.title}`)}&body=${encodeURIComponent(
    `Endereço do recurso: ${permanentUrl}\n\nIdentificação de quem apresenta a denúncia:\n\nDescrição fundamentada da situação:\n`,
  )}`;

  const structured = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[resource.resource_type] ?? "CreativeWork",
    name: resource.title,
    headline: resource.title,
    url: permanentUrl,
    inLanguage: resource.language,
    abstract: resource.abstract ?? undefined,
    keywords: resource.keywords.join(", ") || undefined,
    datePublished: resource.publication_year ? String(resource.publication_year) : undefined,
    author: resource.authors.map((a) => ({
      "@type": "Person",
      name: a.name,
      ...(a.is_published ? { url: absoluteUrl(`/autores/${a.slug}`) } : {}),
    })),
    publisher: resource.publisher ? { "@type": "Organization", name: resource.publisher } : undefined,
    isbn: resource.isbn ?? undefined,
    identifier: resource.doi ? { "@type": "PropertyValue", propertyID: "DOI", value: resource.doi } : undefined,
    license: license.url ?? undefined,
    image: resource.cover_key ? absoluteUrl(`/media/${resource.cover_key}`) : undefined,
    isAccessibleForFree: true,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="border-b border-line bg-surface">
        <div className="container-page py-5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Início" },
              { href: "/biblioteca", label: "Biblioteca" },
              { label: truncate(resource.title, 70) },
            ]}
          />
        </div>
      </div>

      <article className="container-page grid gap-10 py-10 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4 lg:order-none">
          <div className="mx-auto max-w-[16rem] lg:max-w-none">
            <Cover coverKey={resource.cover_key} title={resource.title} type={resource.resource_type} size="lg" priority />
          </div>
          <div className="flex flex-col gap-2">
            {canRead ? (
              <LinkButton href={`/biblioteca/${resource.slug}/leitor`} variant="primary" size="lg">
                <BookOpenText aria-hidden="true" className="h-5 w-5" />
                Ler online
              </LinkButton>
            ) : null}
            {canDownload ? (
              <a href={`/api/recursos/${resource.id}/descarregar`} className={buttonClasses(canRead ? "secondary" : "primary", "lg")}>
                <Download aria-hidden="true" className="h-5 w-5" />
                Descarregar PDF
                {resource.file_size ? <span className="text-xs font-normal opacity-80">({formatBytes(resource.file_size)})</span> : null}
              </a>
            ) : null}
            {resource.external_url ? (
              <a href={resource.external_url} target="_blank" rel="noopener noreferrer" className={buttonClasses(canRead || canDownload ? "secondary" : "primary", "lg")}>
                <ExternalLink aria-hidden="true" className="h-5 w-5" />
                Consultar fonte original
                <span className="sr-only">(abre numa nova janela)</span>
              </a>
            ) : null}
            <ShareButton url={permanentUrl} />
          </div>
          {!canRead && !canDownload && resource.file_key ? (
            <p className="flex gap-2 text-xs leading-relaxed text-muted">
              <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />O ficheiro deste recurso não está disponível para consulta pública nos termos da licença ou da autorização concedida.
            </p>
          ) : null}
          {!resource.file_key && !resource.external_url ? (
            <p className="text-xs leading-relaxed text-muted">Este registo apresenta apenas a descrição bibliográfica do recurso.</p>
          ) : null}
        </aside>

        <div className="min-w-0">
          <p className="eyebrow">{RESOURCE_TYPE_LABELS[resource.resource_type]}</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{resource.title}</h1>
          {resource.subtitle ? <p className="mt-2 font-heading text-xl text-ink">{resource.subtitle}</p> : null}
          <p className="mt-4 text-base text-ink-strong">
            <span className="sr-only">Autoria: </span>
            <AuthorNames authors={resource.authors} />
          </p>

          {resource.abstract ? (
            <section aria-labelledby="titulo-resumo" className="mt-8">
              <h2 id="titulo-resumo" className="text-lg font-semibold">
                Resumo
              </h2>
              <div className="mt-3 max-w-3xl space-y-3 leading-relaxed text-ink">
                {paragraphs(resource.abstract).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {resource.keywords.length ? (
            <section aria-labelledby="titulo-palavras" className="mt-6">
              <h2 id="titulo-palavras" className="text-lg font-semibold">
                Palavras-chave
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {resource.keywords.map((k) => (
                  <li key={k}>
                    <Link
                      href={`/biblioteca?q=${encodeURIComponent(k)}&campo=palavras-chave`}
                      className="inline-flex rounded-sm border border-line bg-surface px-2.5 py-1 text-sm text-ink hover:border-brand-blue hover:text-brand-blue"
                    >
                      {k}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="titulo-metadados" className="mt-8">
            <h2 id="titulo-metadados" className="mb-3 text-lg font-semibold">
              Informação bibliográfica
            </h2>
            <MetaList
              items={[
                { label: "Título", value: resource.subtitle ? `${resource.title}: ${resource.subtitle}` : resource.title },
                { label: "Autoria", value: resource.authors.length ? <AuthorNames authors={resource.authors} /> : null },
                { label: "Ano de publicação", value: resource.publication_year },
                { label: "Tipo de documento", value: RESOURCE_TYPE_LABELS[resource.resource_type] },
                { label: "Área de conhecimento", value: resource.knowledge_area },
                {
                  label: "Área temática",
                  value: resource.collections.length ? (
                    <span>
                      {resource.collections.map((c, i) => (
                        <span key={c.slug}>
                          {i > 0 ? ", " : ""}
                          <Link href={`/colecoes/${c.slug}`} className="link">
                            {c.name}
                          </Link>
                        </span>
                      ))}
                    </span>
                  ) : null,
                },
                { label: "Idioma", value: languageLabel(resource.language) },
                { label: "País", value: resource.country },
                { label: "Instituição ou editora", value: resource.publisher },
                {
                  label: "DOI",
                  value: resource.doi ? (
                    <a href={`https://doi.org/${resource.doi}`} className="link break-all" target="_blank" rel="noopener noreferrer">
                      {resource.doi}
                    </a>
                  ) : null,
                },
                { label: "ISBN", value: resource.isbn },
                {
                  label: "Licença",
                  value: license.url ? (
                    <a href={license.url} className="link" target="_blank" rel="noopener noreferrer">
                      {license.label}
                    </a>
                  ) : (
                    license.label
                  ),
                },
                { label: "Direitos de utilização", value: resource.license_details },
                { label: "Titular dos direitos", value: resource.rights_holder },
                {
                  label: "Acesso ao ficheiro",
                  value: resource.file_key
                    ? [canRead ? "Leitura online autorizada" : "Leitura online não autorizada", canDownload ? "descarregamento autorizado" : "descarregamento não autorizado"].join("; ")
                    : resource.external_url
                      ? "Disponível na fonte original"
                      : null,
                },
                {
                  label: "Sessão relacionada",
                  value: resource.sessions.length ? (
                    <ul className="space-y-1">
                      {resource.sessions.map((s) => (
                        <li key={s.slug} className="flex items-start gap-2">
                          <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                          <span>
                            <Link href={`/sessoes/${s.slug}`} className="link">
                              {s.title}
                            </Link>
                            {s.starts_at ? <span className="text-muted">, {formatDate(s.starts_at, s.timezone)}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null,
                },
                { label: "Publicado na biblioteca", value: formatDate(resource.published_at) },
                { label: "Endereço permanente", value: <span className="break-all">{permanentUrl}</span> },
              ]}
            />
          </section>

          <div className="mt-8">
            <CitationBox apa={apaCitation(citationInput)} abnt={abntCitation(citationInput)} />
          </div>

          <Notice tone="info" className="mt-6">
            Encontrou um erro nos metadados ou considera que este conteúdo viola direitos?{" "}
            <a href={reportHref} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
              <Flag aria-hidden="true" className="h-3.5 w-3.5" />
              Comunicar à equipa editorial
            </a>
            . Consulte os{" "}
            <Link href="/termos-e-condicoes" className="underline underline-offset-2">
              Termos e Condições
            </Link>
            .
          </Notice>
        </div>
      </article>

      {related.length ? (
        <section aria-labelledby="titulo-relacionados" className="container-page">
          <SectionHeading id="titulo-relacionados" title="Materiais relacionados" description="Outros recursos das mesmas áreas temáticas." />
          <ResourceGrid resources={related} />
        </section>
      ) : null}
    </>
  );
}
