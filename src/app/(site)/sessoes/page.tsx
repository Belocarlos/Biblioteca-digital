import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SessionCard } from "@/components/site/session-card";
import { getSessions } from "@/lib/queries/public";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";

export const metadata: Metadata = pageMetadata({
  title: "Sessões Saberes em Rede",
  description: "Arquivo das sessões Saberes em Rede do programa Open Lecture4All: temas, oradores, cartazes, gravações autorizadas e materiais associados.",
  path: "/sessoes",
});

const FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "programadas", label: "Programadas" },
  { value: "realizadas", label: "Realizadas" },
] as const;

export default async function SessionsPage({ searchParams }: PageProps<"/sessoes">) {
  const sp = await searchParams;
  const estado = FILTERS.find((f) => f.value === sp.estado)?.value ?? "todas";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const sessions = await getSessions(estado, q || undefined);
  const hasFilters = estado !== "todas" || !!q;

  return (
    <>
      <PageHeader
        eyebrow="Arquivo"
        title="Sessões Saberes em Rede"
        crumbs={[{ href: "/", label: "Início" }, { label: "Sessões" }]}
        description="As sessões Saberes em Rede promovem o diálogo interdisciplinar e a partilha de experiências académicas e profissionais. Cada sessão reúne a informação verificada sobre o encontro, os oradores e os materiais disponibilizados."
      />
      <div className="container-page py-10">
        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Filtrar sessões por estado">
            <ul className="flex gap-1 rounded-md border border-line-strong p-1">
              {FILTERS.map((f) => {
                const href = `/sessoes${f.value === "todas" ? (q ? `?q=${encodeURIComponent(q)}` : "") : `?estado=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}`;
                return (
                  <li key={f.value}>
                    <Link
                      href={href}
                      aria-current={estado === f.value ? "page" : undefined}
                      className={cn("inline-flex h-8 items-center rounded-sm px-3 text-sm font-medium", estado === f.value ? "bg-brand-blue text-white" : "text-brand-blue hover:bg-brand-blue-50")}
                    >
                      {f.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <form action="/sessoes" method="get" role="search" className="flex gap-2">
            {estado !== "todas" ? <input type="hidden" name="estado" value={estado} /> : null}
            <label htmlFor="sessoes-q" className="sr-only">
              Pesquisar sessões por tema ou orador
            </label>
            <input
              id="sessoes-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Tema ou orador"
              className="h-10 w-full rounded-md border border-line-strong px-3 text-sm focus:border-brand-blue focus:outline-none md:w-64"
            />
            <button type="submit" className="h-10 rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
              Pesquisar
            </button>
          </form>
        </div>

        {sessions.length ? (
          <ul className="grid gap-5 lg:grid-cols-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} />
              </li>
            ))}
          </ul>
        ) : hasFilters ? (
          <EmptyState icon={<CalendarDays />} title="Não foram encontradas sessões para os critérios selecionados." action={<Link href="/sessoes" className="link text-sm">Ver todas as sessões</Link>} />
        ) : (
          <EmptyState icon={<CalendarDays />} title="Ainda não existem sessões publicadas">
            O arquivo das sessões Saberes em Rede será disponibilizado nesta secção. Apenas é publicada informação verificada e autorizada.
          </EmptyState>
        )}
      </div>
    </>
  );
}
