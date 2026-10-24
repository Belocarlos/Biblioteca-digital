import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Mail, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { getSettings } from "@/lib/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contactos",
  description: "Contacto institucional da Biblioteca Digital Open Lecture4All para questões gerais, submissão de materiais, privacidade e denúncia de conteúdos.",
  path: "/contactos",
});

export default async function ContactsPage() {
  const settings = await getSettings();
  const email = settings.contact_email;
  const mail = (subject: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  const items = [
    { icon: Mail, title: "Questões gerais", text: "Informações sobre o programa Open Lecture4All, a biblioteca e as sessões Saberes em Rede.", href: mail("Biblioteca Digital: questão geral"), cta: "Enviar mensagem" },
    { icon: Upload, title: "Submissão de materiais", text: "Para propor um documento, utilize o formulário de submissão. As propostas são analisadas pela equipa editorial.", href: "/submeter", cta: "Abrir formulário", internal: true },
    { icon: Flag, title: "Denúncia de conteúdos", text: "Se considerar que um conteúdo viola direitos de autor ou a lei, indique o endereço da página e a descrição fundamentada da situação.", href: mail("Denúncia de conteúdo"), cta: "Apresentar denúncia" },
    { icon: ShieldCheck, title: "Privacidade e dados pessoais", text: "Pedidos de acesso, correção ou eliminação de dados pessoais e outras questões de privacidade.", href: mail("Privacidade: pedido do titular dos dados"), cta: "Contactar" },
  ];
  return (
    <>
      <PageHeader title="Contactos" crumbs={[{ href: "/", label: "Início" }, { label: "Contactos" }]} description="O programa Open Lecture4All pode ser contactado através do endereço de correio eletrónico institucional." />
      <div className="container-page py-10">
        <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm font-medium text-muted">Contacto institucional</p>
          <a href={`mailto:${email}`} className="mt-2 inline-flex items-center gap-3 break-all font-heading text-2xl font-semibold text-brand-blue hover:underline sm:text-3xl">
            <Mail aria-hidden="true" className="h-7 w-7 shrink-0 text-brand-green" />
            {email}
          </a>
        </div>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} className="flex gap-4 rounded-md border border-line p-5">
              <item.icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-brand-green" />
              <div>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{item.text}</p>
                {item.internal ? (
                  <Link href={item.href} className="link mt-3 inline-block text-sm font-medium">
                    {item.cta}
                  </Link>
                ) : (
                  <a href={item.href} className="link mt-3 inline-block text-sm font-medium">
                    {item.cta}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">
          O tratamento dos dados pessoais enviados por correio eletrónico segue a{" "}
          <Link href="/politica-de-privacidade" className="link">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </>
  );
}
