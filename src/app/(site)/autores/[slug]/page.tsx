import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Breadcrumbs, SectionHeading } from "@/components/ui/misc";
import { AuthorPhoto } from "@/components/site/author-card";
import { ResourceGrid } from "@/components/site/resource-card";
import { SessionCard } from "@/components/site/session-card";
import { mediaUrl } from "@/components/site/media";
import { paragraphs } from "@/lib/markdown";
import { getAuthorBySlug } from "@/lib/queries/public";
import { absoluteUrl, jsonLd, pageMetadata, truncate } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/autores/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAuthorBySlug(slug);
  if (!data) return { title: "Perfil não encontrado", robots: { index: false } };
  const a = data.author;
  return pageMetadata({
    title: a.name,
    description: truncate(a.bio) || [a.specialization, a.institution, a.country].filter(Boolean).join(", ") || `Perfil de ${a.name} na Biblioteca Digital Open Lecture4All.`,
    path: `/autores/${a.slug}`,
    image: mediaUrl(a.photo_key),
    type: "profile",
  });
}

export default async function AuthorPage({ params }: PageProps<"/autores/[slug]">) {
  const { slug } = await params;
  const data = await getAuthorBySlug(slug);
  if (!data) notFound();
  const { author, resources, sessions } = data;

  const structured = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: absoluteUrl(`/autores/${author.slug}`),
    jobTitle: author.specialization ?? undefined,
    affiliation: author.institution ? { "@type": "Organization", name: author.institution } : undefined,
    nationality: author.country ?? undefined,
    image: author.photo_key ? absoluteUrl(`/media/${author.photo_key}`) : undefined,
    sameAs: author.links.map((l) => l.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="border-b border-line bg-surface">
        <div className="container-page py-5">
          <Breadcrumbs items={[{ href: "/", label: "Início" }, { href: "/autores", label: "Autores" }, { label: author.name }]} />
        </div>
        <div className="container-page flex flex-col gap-6 pb-10 pt-4 sm:flex-row sm:items-start">
          <AuthorPhoto photoKey={author.photo_key} alt={author.photo_alt || `Fotografia de ${author.name}`} className="h-32 w-32" />
          <div>
            <p className="eyebrow">Autor e orador</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{author.name}</h1>
            {author.specialization ? <p className="mt-2 text-lg text-ink">{author.specialization}</p> : null}
            {author.institution || author.country ? <p className="mt-1 text-sm text-muted">{[author.institution, author.country].filter(Boolean).join(", ")}</p> : null}
            {author.links.length ? (
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {author.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5">
                      {l.label}
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="sr-only">(abre numa nova janela)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container-page space-y-12 py-10">
        {author.bio ? (
          <section aria-labelledby="t-bio">
            <SectionHeading id="t-bio" title="Biografia" />
            <div className="max-w-3xl space-y-3 leading-relaxed">
              {paragraphs(author.bio).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="t-publicacoes">
          <SectionHeading id="t-publicacoes" title="Publicações disponíveis" description={resources.length ? `${resources.length} ${resources.length === 1 ? "recurso" : "recursos"} na biblioteca` : undefined} />
          {resources.length ? <ResourceGrid resources={resources} /> : <p className="text-sm text-muted">Ainda não existem publicações associadas a este perfil.</p>}
        </section>

        <section aria-labelledby="t-sessoes">
          <SectionHeading id="t-sessoes" title="Sessões realizadas" />
          {sessions.length ? (
            <ul className="grid gap-5 lg:grid-cols-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <SessionCard session={s} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ainda não existem sessões associadas a este perfil.</p>
          )}
        </section>
      </div>
    </>
  );
}
