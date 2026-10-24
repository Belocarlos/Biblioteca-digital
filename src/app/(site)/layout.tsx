import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getSettings } from "@/lib/queries/public";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-brand-blue focus:shadow"
      >
        Saltar para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
