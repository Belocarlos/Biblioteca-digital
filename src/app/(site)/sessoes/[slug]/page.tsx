import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ExternalLink, MapPin, Video } from "lucide-react";
import { Breadcrumbs, MetaList, SectionHeading } from "@/components/ui/misc";
import { EventStatusBadge } from "@/components/site/session-card";
import { ResourceGrid } from "@/components/site/resource-card";
import { RecordingEmbed } from "@/components/site/recording-embed";
import { AuthorPhoto } from "@/components/site/author-card";
import { mediaUrl } from "@/components/site/media";
import { formatDate, formatTime, timezoneLabel } from "@/lib/format";
import { paragraphs } from "@/lib/markdown";
import { getSessionBySlug } from "@/lib/queries/public";
import { toVideoEmbed } from "@/lib/video";
import { absoluteUrl, jsonLd, pageMetadata, truncate } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/sessoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSessionBySlug(slug);
  if (!s) return { title: "Sessão não encontrada", robots: { index: false } };
  return pageMetadata({
    title: s.title,
    description: truncate(s.summary || s.description) || "Sessão Saberes em Rede do programa Open Lecture4All.",
    path: `/sessoes/${s.slug}`,
    image: mediaUrl(s.poster_key),
    type: "article",
  });
}

export default async function SessionPage({ params }: PageProps<"/sessoes/[slug]">) {
  const { slug } = await params;
  const session = await getSessionBySlug(slug);
  if (!session) notFound();

  const embed = session.recording_authorized ? toVideoEmbed(session.recording_url) : null;
  const recordingLink = session.recording_authorized && session.recording_url && !embed ? session.recording_url : null;
  const recordingResources = session.resources.filter((r) => r.relation === "recording");
  const presentations = session.resources.filter((r) => r.relation === "presentation");
  const related = session.resources.filter((r) => r.relation === "related");
  const poster = mediaUrl(session.poster_key);
  const tz = session.timezone;

  const structured = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: session.title,
    url: absoluteUrl(`/sessoes/${session.slug}`),
    description: session.summary ?? undefined,
    startDate: session.starts_at ?? undefined,
    endDate: session.ends_at ?? undefined,
    eventStatus:
      session.event_status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : session.event_status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    image: poster ? absoluteUrl(poster) : undefined,
    performer: session.speaker_profiles.map((p) => ({ "@type": "Person", name: p.name })),
    organizer: { "@type": "Organization", name: "Open Lecture4All" },
    inLanguage: "pt",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="border-b border-line bg-surface">
        <div className="container-page py-5">
          <Breadcrumbs items={[{ href: "/", label: "Início" }, { href: "/sessoes", label: "Sessões" }, { label: truncate(session.title, 70) }]} />
        </div>
      </div>

      <article className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Saberes em Rede</p>
            <EventStatusBadge status={session.event_status} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{session.title}</h1>

          <ul className="mt-5 flex flex-col gap-2 text-sm text-ink sm:flex-row sm:flex-wrap sm:gap-x-6">
            {session.starts_at ? (
              <>
                <li className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-green" />
                  {formatDate(session.starts_at, tz)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock aria-hidden="true" className="h-4 w-4 text-brand-green" />
                  {formatTime(session.starts_at, tz)}
                  {session.ends_at ? ` às ${formatTime(session.ends_at, tz)}` : ""} ({timezoneLabel(tz)})
                </li>
              </>
            ) : (
              <li className="text-muted">Data a confirmar</li>
            )}
            {session.format ? (
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="h-4 w-4 text-brand-green" />
                {session.format}
              </li>
            ) : null}
          </ul>

          {session.description || session.summary ? (
            <section aria-labelledby="t-descricao" className="mt-8">
              <h2 id="t-descricao" className="text-xl font-semibold">
                Descrição do encontro
              </h2>
              <div className="mt-3 max-w-3xl space-y-3 leading-relaxed">
                {paragraphs(session.description || session.summary).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {session.topics.length ? (
            <section aria-labelledby="t-assuntos" className="mt-8">
              <h2 id="t-assuntos" className="text-xl font-semibold">
                Principais assuntos discutidos
              </h2>
              <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-5 leading-relaxed">
                {session.topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="t-gravacao" className="mt-8">
            <h2 id="t-gravacao" className="mb-3 text-xl font-semibold">
              Gravação
            </h2>
            {embed ? (
              <RecordingEmbed embedUrl={embed.embedUrl} provider={embed.label} originalUrl={session.recording_url!} title={session.title} />
            ) : recordingLink ? (
              <a href={recordingLink} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-2">
                <Video aria-hidden="true" className="h-4 w-4" />
                Consultar a gravação da sessão
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="sr-only">(abre numa nova janela)</span>
              </a>
            ) : recordingResources.length ? null : (
              <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">A gravação desta sessão ainda não está disponível.</p>
            )}
            {recordingResources.length ? (
              <div className="mt-4">
                <ResourceGrid resources={recordingResources} narrow />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="t-apresentacao" className="mt-10">
            <SectionHeading id="t-apresentacao" title="Apresentação utilizada" />
            {presentations.length ? (
              <ResourceGrid resources={presentations} narrow />
            ) : (
              <p className="text-sm text-muted">A apresentação desta sessão ainda não foi disponibilizada.</p>
            )}
          </section>

          {related.length ? (
            <section aria-labelledby="t-documentos" className="mt-10">
              <SectionHeading id="t-documentos" title="Documentos relacionados" />
              <ResourceGrid resources={related} narrow />
            </section>
          ) : null}

          {session.references_text ? (
            <section aria-labelledby="t-referencias" className="mt-10">
              <SectionHeading id="t-referencias" title="Referências recomendadas" />
              <ul className="max-w-3xl space-y-2 text-sm leading-relaxed">
                {session.references_text
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((ref, i) => (
                    <li key={i} className="border-l-2 border-line pl-3">
                      {ref}
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <figure>
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={session.poster_alt || `Cartaz oficial da sessão ${session.title}`} width={640} height={800} className="w-full rounded-md border border-line" />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-md border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-muted">
                O cartaz oficial desta sessão ainda não foi disponibilizado.
              </div>
            )}
            {poster ? <figcaption className="mt-2 text-xs text-muted">Cartaz oficial da sessão.</figcaption> : null}
          </figure>

          <section aria-labelledby="t-oradores">
            <h2 id="t-oradores" className="mb-3 border-b border-line pb-2 text-lg font-semibold">
              {session.speaker_profiles.length === 1 ? "Orador" : "Oradores"}
            </h2>
            {session.speaker_profiles.length ? (
              <ul className="space-y-5">
                {session.speaker_profiles.map((p) => (
                  <li key={p.slug}>
                    <div className="flex items-start gap-3">
                      <AuthorPhoto photoKey={p.photo_key} alt={`Fotografia de ${p.name}`} className="h-12 w-12" />
                      <div>
                        <p className="font-semibold text-brand-blue">
                          {p.is_published ? (
                            <Link href={`/autores/${p.slug}`} className="hover:underline">
                              {p.name}
                            </Link>
                          ) : (
                            p.name
                          )}
                        </p>
                        {p.role === "moderator" ? <p className="text-xs text-muted">Moderação</p> : null}
                        {p.specialization || p.institution ? (
                          <p className="text-sm text-muted">{[p.specialization, p.institution, p.country].filter(Boolean).join(", ")}</p>
                        ) : null}
                      </div>
                    </div>
                    {p.bio ? <p className="mt-2 text-sm leading-relaxed text-ink">{truncate(p.bio, 420)}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Oradores a confirmar.</p>
            )}
          </section>

          <MetaList
            items={[
              { label: "Estado", value: <EventStatusBadge status={session.event_status} /> },
              { label: "Data", value: session.starts_at ? formatDate(session.starts_at, tz) : null },
              { label: "Formato", value: session.format },
            ]}
          />
        </aside>
      </article>
    </>
  );
}
