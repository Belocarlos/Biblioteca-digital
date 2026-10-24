import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { asUser, requireRole } from "@/lib/auth/session";
import { getSettings } from "@/lib/queries/public";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { UploadForm } from "@/components/admin/forms";
import { Badge, MetaList } from "@/components/ui/misc";
import { mediaUrl } from "@/components/site/media";
import { AboutForm, GeneralSettingsForm } from "./settings-forms";
import { uploadShareImage } from "./actions";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireRole(["admin"]);
  const settings = await getSettings();
  const legal = await asUser(user, (tx) => tx<{ slug: string; title: string; version: number; review_status: string; updated_at: Date }[]>`select slug, title, version, review_status, updated_at from legal_documents order by slug`);
  const ogImage = mediaUrl(settings.og_image_key);
  const sub = [
    { href: "/admin/configuracoes/equipa", label: "Equipa responsável", text: "Elementos da equipa e fotografias autorizadas." },
    { href: "/admin/configuracoes/parceiros", label: "Parceiros institucionais", text: "Apenas parcerias formalmente confirmadas." },
    { href: "/admin/configuracoes/registo", label: "Registo de atividade", text: "Ações administrativas relevantes." },
  ];
  return (
    <>
      <AdminHeader title="Configurações" description="Informação institucional, textos editáveis e parâmetros da plataforma." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Dados gerais">
          <GeneralSettingsForm values={settings} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Documentos jurídicos" description="Textos sujeitos a revisão jurídica e aprovação institucional.">
            <ul className="divide-y divide-line">
              {legal.map((d) => (
                <li key={d.slug}>
                  <Link href={`/admin/configuracoes/legal/${d.slug}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-blue">
                    <span>
                      <span className="block font-medium">{d.title}</span>
                      <span className="text-xs text-muted">
                        Versão {d.version} · {formatDateTime(d.updated_at)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {d.review_status === "approved" ? <Badge tone="green">Aprovado</Badge> : <Badge tone="warning">Em revisão</Badge>}
                      <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Página Sobre Nós">
            <ul className="divide-y divide-line">
              {sub.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex items-center justify-between gap-3 py-3 hover:text-brand-blue">
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="text-xs text-muted">{s.text}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Imagem de partilha" description="Utilizada nas pré-visualizações em redes sociais. Recomenda-se 1200 x 630 píxeis.">
            {ogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ogImage} alt="Imagem de partilha atual" className="mb-4 w-full max-w-sm rounded-sm border border-line" />
            ) : (
              <p className="mb-4 text-sm text-muted">É utilizada a imagem predefinida gerada pela plataforma.</p>
            )}
            <UploadForm action={uploadShareImage} id="og" field="og" accept="image/jpeg,image/png,image/webp" label="Nova imagem" help="JPEG, PNG ou WebP." hasFile={!!ogImage} removeLabel="Repor predefinida" />
          </Panel>
          <Panel title="Ambiente" description="Definido através de variáveis de ambiente no alojamento.">
            <MetaList
              items={[
                { label: "Endereço público", value: env.siteUrl },
                { label: "Indexação", value: env.indexingEnabled ? "Permitida" : "Bloqueada (ambiente de pré-visualização)" },
                { label: "Armazenamento", value: env.storageDriver === "s3" ? "Serviço compatível com S3" : "Disco local do servidor" },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Texto da página Sobre Nós" className="xl:col-span-2">
          <AboutForm value={settings.about_md} />
        </Panel>
      </div>
    </>
  );
}
