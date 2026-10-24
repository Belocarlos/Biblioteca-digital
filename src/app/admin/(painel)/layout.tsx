import Link from "next/link";
import { ExternalLink, LogOut, UserRound } from "lucide-react";
import { AdminNav } from "@/components/admin/shell";
import { Monogram } from "@/components/site/logo";
import { asUser, requireUser } from "@/lib/auth/session";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { logout } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser({ allowPasswordChange: true });
  const [counts] = await asUser(user, (tx) =>
    tx<{ pending: number; in_review: number }[]>`
      select (select count(*)::int from submissions where status = 'pending') as pending,
             (select count(*)::int from resources where status = 'in_review') as in_review`,
  );
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[15rem_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-brand-blue">
        Saltar para o conteúdo
      </a>
      <aside className="bg-brand-blue lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/admin" className="hidden items-center gap-3 border-b border-white/10 px-5 py-4 lg:flex">
          <Monogram className="h-9 w-9" />
          <span className="leading-tight text-white">
            <span className="block font-heading font-semibold">Biblioteca Digital</span>
            <span className="block text-xs text-white/70">Painel administrativo</span>
          </span>
        </Link>
        <AdminNav role={user.role} pendingSubmissions={counts?.pending ?? 0} inReview={counts?.in_review ?? 0} />
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 text-xs text-white/70 lg:block">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-white hover:underline">
            Ver website <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-b border-line bg-white px-4 py-3 sm:px-8">
          <Link href="/admin/conta" className="inline-flex items-center gap-2 text-sm text-ink hover:text-brand-blue">
            <UserRound aria-hidden="true" className="h-4 w-4 text-muted" />
            <span className="font-medium">{user.name}</span>
            <span className="rounded-sm bg-surface px-1.5 py-0.5 text-xs text-muted">{USER_ROLE_LABELS[user.role]}</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Terminar sessão
            </button>
          </form>
        </header>
        <main id="conteudo" tabIndex={-1} className="px-4 py-8 focus:outline-none sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
