import Link from "next/link";
import { Monogram } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-lg text-center">
        <Monogram className="mx-auto h-12 w-12" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-green">Erro 404</p>
        <h1 className="mt-2 text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-3 leading-relaxed text-ink">O endereço pode estar incorreto ou o conteúdo pode já não estar disponível publicamente.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-10 items-center rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
            Página inicial
          </Link>
          <Link href="/biblioteca" className="inline-flex h-10 items-center rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
            Pesquisar na biblioteca
          </Link>
        </div>
      </div>
    </main>
  );
}
