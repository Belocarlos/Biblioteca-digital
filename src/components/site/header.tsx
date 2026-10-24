import Link from "next/link";
import { Lock, Search, Upload } from "lucide-react";
import { Logo } from "./logo";
import { DesktopNav, MobileMenu } from "./header-nav";
import { SLOGAN } from "@/lib/constants";

export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-white">
      <div className="bg-brand-blue text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <p className="truncate text-white/90">
            <span className="font-semibold text-white">Programa Open Lecture4All</span>
            <span className="hidden sm:inline"> · {SLOGAN}</span>
          </p>
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/submeter" className="hidden items-center gap-1.5 text-white/90 hover:text-white hover:underline sm:inline-flex">
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              Submeter material
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white hover:underline">
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              Área reservada
            </Link>
          </div>
        </div>
      </div>
      <div className="container-page flex items-center justify-between gap-6 py-4">
        <Link href="/" className="shrink-0">
          <Logo />
          <span className="sr-only">, página inicial</span>
        </Link>
        <form action="/biblioteca" method="get" role="search" className="hidden max-w-md flex-1 md:flex">
          <label htmlFor="header-q" className="sr-only">
            Pesquisar na biblioteca
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="header-q"
              name="q"
              type="search"
              placeholder="Pesquisar livros, artigos, autores ou temas..."
              className="h-10 w-full rounded-l-md border border-r-0 border-line-strong bg-white pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand-blue"
            />
          </div>
          <button type="submit" className="h-10 rounded-r-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
            Pesquisar
          </button>
        </form>
        <MobileMenu />
      </div>
      <div className="hidden border-t border-line lg:block">
        <div className="container-page">
          <DesktopNav />
        </div>
      </div>
    </header>
  );
}
