import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Termos e Condições",
  description: "Condições de utilização da Biblioteca Digital Open Lecture4All, direitos de autor, regras de submissão e procedimentos de denúncia de conteúdos.",
  path: "/termos-e-condicoes",
});

export default function TermsPage() {
  return <LegalPage slug="termos-e-condicoes" />;
}
