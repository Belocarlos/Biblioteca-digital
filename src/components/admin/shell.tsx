"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpen, CalendarDays, FolderOpen, Inbox, LayoutDashboard, Menu, Settings, UserCog, Users, X } from "lucide-react";
import { Monogram } from "@/components/site/logo";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/lib/constants";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/recursos", label: "Recursos", icon: BookOpen, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/sessoes", label: "Sessões", icon: CalendarDays, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/autores", label: "Autores", icon: Users, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/colecoes", label: "Coleções", icon: FolderOpen, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/submissoes", label: "Submissões", icon: Inbox, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: UserCog, roles: ["admin"] },
  { href: "/admin/estatisticas", label: "Estatísticas", icon: BarChart3, roles: ["admin", "editor", "reviewer"] },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
] as const;

export function AdminNav({ role, pendingSubmissions, inReview }: { role: UserRole; pendingSubmissions: number; inReview: number }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const items = NAV.filter((i) => (i.roles as readonly string[]).includes(role));
  const counts: Record<string, number> = { "/admin/submissoes": pendingSubmissions, "/admin/recursos": inReview };

  const list = (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const count = counts[item.href];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {count ? (
                <span className="rounded-sm bg-brand-green px-1.5 text-xs font-semibold text-white" aria-label={`${count} pendentes`}>
                  {count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 text-white">
          <Monogram className="h-8 w-8" />
          <span className="font-heading font-semibold">Painel</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpenPath(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="admin-nav-mobile"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm text-white"
        >
          {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
          Menu
        </button>
      </div>
      <nav id="admin-nav-mobile" aria-label="Menu do painel" hidden={!open} className="px-3 pb-4 lg:hidden">
        {list}
      </nav>
      <nav aria-label="Menu do painel" className="hidden px-3 py-4 lg:block">
        {list}
      </nav>
    </>
  );
}
