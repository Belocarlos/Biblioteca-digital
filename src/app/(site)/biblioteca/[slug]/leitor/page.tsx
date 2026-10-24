import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PdfViewer } from "@/components/site/pdf-viewer";
import { getResourceBySlug, trackResourceEvent } from "@/lib/queries/public";
import { licenseInfo } from "@/lib/constants";

export async function generateMetadata({ params }: PageProps<"/biblioteca/[slug]/leitor">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getResourceBySlug(slug);
  return {
    title: r ? `Leitura: ${r.title}` : "Documento não encontrado",
    robots: { index: false, follow: true },
    alternates: r ? { canonical: `/biblioteca/${r.slug}` } : undefined,
  };
}

export default async function ReaderPage({ params }: PageProps<"/biblioteca/[slug]/leitor">) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource || !resource.allow_online_reading || !resource.file_key) notFound();
  after(() => trackResourceEvent(resource.id, "read"));
  const license = licenseInfo(resource.license);

  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/biblioteca/${resource.slug}`} className="link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Voltar ao registo do documento
          </Link>
          <h1 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{resource.title}</h1>
        </div>
        <p className="text-xs text-muted">Licença: {license.label}</p>
      </div>
      <PdfViewer
        url={`/api/recursos/${resource.id}/pdf`}
        title={resource.title}
        downloadUrl={resource.allow_download ? `/api/recursos/${resource.id}/descarregar` : null}
      />
    </div>
  );
}
