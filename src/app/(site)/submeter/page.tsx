import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { SubmissionForm } from "./submission-form";
import { createFormToken } from "@/lib/security";
import { LIMITS } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Submeter material",
  description: "Investigadores e oradores podem propor a inclusão de documentos na Biblioteca Digital Open Lecture4All. As propostas são analisadas pela equipa editorial.",
  path: "/submeter",
});

export default function SubmitPage() {
  return (
    <>
      <PageHeader
        title="Submeter material"
        crumbs={[{ href: "/", label: "Início" }, { label: "Submeter material" }]}
        description="Investigadores e oradores podem propor a inclusão de documentos na biblioteca. Os materiais submetidos não são publicados automaticamente e ficam pendentes de revisão pela equipa editorial."
      />
      <div className="container-page grid gap-12 py-10 lg:grid-cols-[1fr_18rem]">
        <SubmissionForm formToken={createFormToken()} maxMb={LIMITS.pdfSubmissionBytes / 1024 / 1024} />
        <aside className="space-y-5 text-sm leading-relaxed">
          <div className="rounded-md border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">Como é analisada a proposta</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-ink">
              <li>A submissão fica registada como pendente.</li>
              <li>A equipa editorial verifica os metadados, a licença e a autorização.</li>
              <li>Se for aceite, o material é preparado e segue o fluxo editorial antes da publicação.</li>
            </ol>
          </div>
          <div className="rounded-md border border-line p-5">
            <h2 className="text-base font-semibold">Requisitos</h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-ink">
              <li>Ficheiros em PDF até {LIMITS.pdfSubmissionBytes / 1024 / 1024} MB, sem JavaScript nem anexos.</li>
              <li>Informação clara sobre a licença e os direitos de autor.</li>
              <li>Autorização do titular para a disponibilização.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
