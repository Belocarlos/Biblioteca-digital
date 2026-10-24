"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="conteudo" className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">Serviço temporariamente indisponível</p>
        <h1 className="mt-2 text-3xl font-semibold">Não foi possível carregar esta página</h1>
        <p className="mt-3 leading-relaxed text-ink">Ocorreu um erro ao obter a informação. Tente novamente dentro de alguns instantes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex h-10 items-center rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
            Tentar novamente
          </button>
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
            Página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
