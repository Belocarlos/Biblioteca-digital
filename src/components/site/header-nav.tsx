"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { MAIN_NAV, isActive } from "./nav-links";
import { cn } from "@/lib/cn";

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="hidden lg:block">
      <ul className="flex items-stretch gap-1">
        {MAIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center border-b-2 px-3 py-3 text-[0.9375rem] font-medium transition-colors",
                  active ? "border-brand-green text-brand-blue" : "border-transparent text-ink hover:border-line-strong hover:text-brand-blue",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileMenu() {
  const pathname = usePathname();
  // O menu fica associado ao endereço em que foi aberto e fecha ao navegar.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean | ((v: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    setOpenPath(next ? pathname : null);
  };
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPath(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong px-3 text-sm font-medium text-brand-blue hover:bg-brand-blue-50"
      >
        {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
        Menu
      </button>
      <div id={menuId} hidden={!open} className="absolute inset-x-0 top-full z-40 border-b border-line bg-white shadow-sm">
        <div className="container-page py-4">
          <form action="/biblioteca" method="get" role="search" className="mb-4 flex gap-2">
            <label htmlFor={`${menuId}-q`} className="sr-only">
              Pesquisar na biblioteca
            </label>
            <input
              id={`${menuId}-q`}
              name="q"
              type="search"
              placeholder="Pesquisar livros, artigos, autores ou temas..."
              className="h-10 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-sm focus:border-brand-blue focus:outline-none"
            />
            <button type="submit" className="inline-flex h-10 items-center rounded-md bg-brand-blue px-3 text-white" aria-label="Pesquisar">
              <Search aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
          <nav aria-label="Navegação principal (móvel)">
            <ul className="divide-y divide-line border-y border-line">
              {MAIN_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn("block py-3 text-base font-medium", active ? "text-brand-green" : "text-brand-blue")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/submeter" className="block py-3 text-base font-medium text-brand-blue">
                  Submeter material
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
