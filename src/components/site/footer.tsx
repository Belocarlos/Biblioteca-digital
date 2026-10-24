import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { Monogram } from "./logo";
import { MAIN_NAV } from "./nav-links";
import { SITE_NAME, SLOGAN } from "@/lib/constants";
import type { SiteSettings } from "@/lib/queries/public";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t-4 border-brand-blue bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <Monogram className="h-9 w-9" />
            <p className="font-heading text-lg font-semibold text-brand-blue">{SITE_NAME}</p>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink">
            Repositório digital do programa internacional Open Lecture4All, dedicado à democratização do conhecimento, à divulgação
            científica, à educação, à sustentabilidade e à cooperação entre investigadores, docentes, profissionais, estudantes e comunidades.
          </p>
          <p className="mt-3 text-sm font-medium text-brand-green">{SLOGAN}</p>
        </div>

        <nav aria-label="Navegação do rodapé" className="md:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-blue">Navegação</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink hover:text-brand-blue hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/submeter" className="text-ink hover:text-brand-blue hover:underline">
                Submeter material
              </Link>
            </li>
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-blue">Contacto</h2>
          <p className="mt-4 text-sm">
            <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-2 text-ink hover:text-brand-blue hover:underline">
              <Mail aria-hidden="true" className="h-4 w-4 text-brand-green" />
              {settings.contact_email}
            </a>
          </p>
          {settings.social_links.length > 0 ? (
            <>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-brand-blue">Redes sociais</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {settings.social_links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} rel="noopener noreferrer" target="_blank" className="inline-flex items-center gap-2 text-ink hover:text-brand-blue hover:underline">
                      {link.label}
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
                      <span className="sr-only">(abre numa nova janela)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Open Lecture4All. Direitos de autor dos materiais reservados aos respetivos titulares, salvo indicação de licença em contrário.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/politica-de-privacidade" className="hover:text-brand-blue hover:underline">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos-e-condicoes" className="hover:text-brand-blue hover:underline">
                Termos e Condições
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-brand-blue hover:underline">
                Área reservada
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
