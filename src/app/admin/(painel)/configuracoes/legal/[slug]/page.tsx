import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asUser, requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { LegalForm } from "../../settings-forms";

export const metadata: Metadata = { title: "Documento jurídico" };

export default async function LegalEditPage({ params }: PageProps<"/admin/configuracoes/legal/[slug]">) {
  const user = await requireRole(["admin"]);
  const { slug } = await params;
  if (!["politica-de-privacidade", "termos-e-condicoes"].includes(slug)) notFound();
  const data = await asUser(user, async (tx) => {
    const [doc] = await tx<{ slug: string; title: string; body_md: string; version: number; review_status: string; approved_at: Date | null }[]>`
      select slug, title, body_md, version, review_status, approved_at from legal_documents where slug = ${slug}`;
    const versions = await tx<{ version: number; review_status: string; created_at: Date; author: string | null }[]>`
      select v.version, v.review_status, v.created_at, u.name as author from legal_document_versions v left join users u on u.id = v.created_by
      where v.slug = ${slug} order by v.version desc limit 30`;
    return { doc, versions };
  });
  if (!data.doc) notFound();
  return (
    <>
      <AdminHeader title={data.doc.title} back={{ href: "/admin/configuracoes", label: "Configurações" }} actions={<Link href={`/${slug}`} target="_blank" className="link text-sm">Ver página pública</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="rounded-md border border-line bg-white p-5 sm:p-8">
          <LegalForm doc={data.doc} />
        </div>
        <Panel title="Histórico de versões">
          <ol className="space-y-3 text-sm">
            {data.versions.map((v) => (
              <li key={v.version} className="flex items-start justify-between gap-2 border-b border-line pb-2 last:border-0">
                <span>
                  <span className="font-medium">Versão {v.version}</span>
                  <span className="block text-xs text-muted">
                    {formatDateTime(v.created_at)}
                    {v.author ? ` · ${v.author}` : " · Versão inicial"}
                  </span>
                </span>
                {v.review_status === "approved" ? <Badge tone="green">Aprovada</Badge> : <Badge tone="warning">Em revisão</Badge>}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
