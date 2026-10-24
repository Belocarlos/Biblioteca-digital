import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Política de Privacidade",
  description: "Informação sobre o tratamento de dados pessoais na Biblioteca Digital Open Lecture4All, nos termos do RGPD, da LGPD e demais normas aplicáveis.",
  path: "/politica-de-privacidade",
});

export default function PrivacyPage() {
  return <LegalPage slug="politica-de-privacidade" />;
}
