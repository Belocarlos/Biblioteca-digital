import type { Metadata } from "next";
import { Building2, ExternalLink, UserRound } from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { AuthorPhoto } from "@/components/site/author-card";
import { mediaUrl } from "@/components/site/media";
import { renderMarkdown } from "@/lib/markdown";
import { getSettings, getTeamAndPartners } from "@/lib/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sobre Nós",
  description: "O programa internacional Open Lecture4All, a missão, os objetivos e a origem da Biblioteca Digital, o público-alvo, as áreas de atuação, a equipa e os parceiros institucionais.",
  path: "/sobre",
});

export default async function AboutPage() {
  const [settings, { team, partners }] = await Promise.all([getSettings(), getTeamAndPartners()]);
  return (
    <>
      <PageHeader title="Sobre Nós" crumbs={[{ href: "/", label: "Início" }, { label: "Sobre Nós" }]} description="Conhecimento sem fronteiras, acessível a todos." />
      <div className="container-page grid gap-12 py-10 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-14">
          <div className="prose-institutional" dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.about_md) }} />

          <section aria-labelledby="t-equipa">
            <SectionHeading id="t-equipa" title="Equipa responsável" />
            {team.length ? (
              <ul className="grid gap-5 sm:grid-cols-2">
                {team.map((m) => (
                  <li key={m.id} className="flex gap-4 rounded-md border border-line p-4">
                    <AuthorPhoto photoKey={m.photo_key} alt={`Fotografia de ${m.name}`} className="h-20 w-20" />
                    <div>
                      <p className="font-heading text-lg font-semibold text-brand-blue">{m.name}</p>
                      {m.role_title ? <p className="text-sm font-medium text-brand-green">{m.role_title}</p> : null}
                      {m.bio ? <p className="mt-2 text-sm leading-relaxed text-ink">{m.bio}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-4 rounded-md border border-dashed border-line-strong p-6">
                <UserRound aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 stroke-[1.5] text-muted" />
                <p className="text-sm leading-relaxed text-muted">
                  A apresentação da equipa responsável, com fotografias autorizadas, será publicada nesta secção após confirmação institucional.
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="t-parceiros">
            <SectionHeading id="t-parceiros" title="Parceiros institucionais" />
            {partners.length ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partners.map((p) => {
                  const logo = mediaUrl(p.logo_key);
                  return (
                    <li key={p.id} className="flex flex-col rounded-md border border-line p-4">
                      <div className="flex h-20 items-center justify-center rounded-sm bg-surface p-3">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt={`Logótipo de ${p.name}`} className="max-h-full max-w-full object-contain" loading="lazy" />
                        ) : (
                          <Building2 aria-hidden="true" className="h-8 w-8 stroke-[1.25] text-muted" />
                        )}
                      </div>
                      <p className="mt-3 font-semibold text-brand-blue">{p.name}</p>
                      {p.description ? <p className="mt-1 text-sm text-ink">{p.description}</p> : null}
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="link mt-auto inline-flex items-center gap-1 pt-3 text-sm">
                          Website
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                          <span className="sr-only">(abre numa nova janela)</span>
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex items-start gap-4 rounded-md border border-dashed border-line-strong p-6">
                <Building2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 stroke-[1.5] text-muted" />
                <p className="text-sm leading-relaxed text-muted">
                  Os parceiros institucionais e respetivos logótipos oficiais serão apresentados nesta secção apenas após confirmação formal da parceria.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">Contribuir para a biblioteca</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">Investigadores e oradores podem propor a inclusão de publicações e materiais.</p>
            <LinkButton href="/submeter" variant="primary" className="mt-4 w-full">
              Submeter material
            </LinkButton>
          </div>
          <div className="rounded-md border border-line p-5">
            <h2 className="text-base font-semibold">Contacto institucional</h2>
            <a href={`mailto:${settings.contact_email}`} className="link mt-2 inline-block break-all text-sm">
              {settings.contact_email}
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
