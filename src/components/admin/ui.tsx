import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Notice } from "@/components/ui/misc";
import { EDITORIAL_STATUS_LABELS, type EditorialStatus } from "@/lib/constants";
import { STATUS_TONES } from "@/lib/workflow";
import { cn } from "@/lib/cn";

export function AdminHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="link text-sm">
            {back.label}
          </Link>
        ) : null}
        <h1 className={cn("text-2xl font-semibold sm:text-3xl", back ? "mt-2" : "")}>{title}</h1>
        {description ? <div className="mt-1.5 max-w-3xl text-sm text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: EditorialStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{EDITORIAL_STATUS_LABELS[status]}</Badge>;
}

export function Panel({ title, description, children, actions, className }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-line bg-white", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="border-b border-line px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Mensagem de confirmação após redirecionamento (parâmetro ?ok=). */
export function Flash({ ok }: { ok?: string | string[] }) {
  const messages: Record<string, string> = {
    criado: "Registo criado com sucesso.",
    guardado: "Alterações guardadas.",
    eliminado: "Registo eliminado.",
    estado: "Estado editorial atualizado.",
    ficheiro: "Ficheiro atualizado.",
    convertido: "Submissão convertida num recurso em rascunho.",
    palavra: "Palavra-passe alterada.",
  };
  const key = Array.isArray(ok) ? ok[0] : ok;
  if (!key || !messages[key]) return null;
  return (
    <Notice tone="success" className="mb-6">
      {messages[key]}
    </Notice>
  );
}

export function FilterTabs({ items, current }: { items: { value: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Filtrar por estado" className="mb-5 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((i) => (
          <li key={i.value}>
            <Link
              href={i.href}
              aria-current={current === i.value ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium",
                current === i.value ? "border-brand-green text-brand-blue" : "border-transparent text-muted hover:text-brand-blue",
              )}
            >
              {i.label}
              {i.count !== undefined ? <span className="rounded-sm bg-surface px-1.5 text-xs text-muted">{i.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
