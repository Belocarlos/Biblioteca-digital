import { notFound } from "next/navigation";
import { PageHeader, Notice } from "@/components/ui/misc";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { getLegalDocument } from "@/lib/queries/public";

export async function LegalPage({ slug }: { slug: "politica-de-privacidade" | "termos-e-condicoes" }) {
  const doc = await getLegalDocument(slug);
  if (!doc) notFound();
  return (
    <>
      <PageHeader title={doc.title} crumbs={[{ href: "/", label: "Início" }, { label: doc.title }]}>
        <p className="mt-4 text-sm text-muted">
          Versão {doc.version} · Última atualização: {formatDate(doc.updated_at)}
          {doc.review_status === "approved" && doc.approved_at ? ` · Aprovada em ${formatDate(doc.approved_at)}` : ""}
        </p>
      </PageHeader>
      <div className="container-page py-10">
        {doc.review_status !== "approved" ? (
          <Notice tone="warning" title="Documento em revisão" className="mb-8 max-w-3xl">
            Este texto é uma versão preliminar que aguarda revisão jurídica e aprovação institucional.
          </Notice>
        ) : null}
        <div className="prose-institutional" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.body_md) }} />
      </div>
    </>
  );
}
