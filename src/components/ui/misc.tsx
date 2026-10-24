import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "teal" | "warning" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-surface text-ink border-line",
    blue: "bg-brand-blue-50 text-brand-blue border-brand-blue-100",
    green: "bg-brand-green-50 text-brand-green-dark border-[#cfe6dc]",
    teal: "bg-brand-teal-50 text-brand-teal-dark border-[#cde6e7]",
    warning: "bg-warning-50 text-warning border-[#f3dfae]",
    danger: "bg-danger-50 text-danger border-[#f7c9c4]",
  };
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium leading-5", tones[tone], className)}>
      {children}
    </span>
  );
}

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Localização" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-line-strong" /> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-blue hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  crumbs,
  eyebrow,
  children,
}: {
  title: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page py-8 sm:py-10">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        {eyebrow ? <p className={cn("eyebrow", crumbs ? "mt-5" : "")}>{eyebrow}</p> : null}
        <h1 className={cn("text-3xl font-semibold sm:text-4xl", crumbs && !eyebrow ? "mt-4" : "mt-2")}>{title}</h1>
        {description ? <div className="mt-3 max-w-3xl text-base leading-relaxed text-ink">{description}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center text-muted [&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[1.5]">{icon}</div> : null}
      <p className="font-heading text-lg font-semibold text-brand-blue">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">{children}</div> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "success" | "danger"; title?: string; children?: ReactNode; className?: string }) {
  const map = {
    info: { cls: "border-brand-blue-100 bg-brand-blue-50 text-brand-blue", Icon: Info },
    warning: { cls: "border-[#f3dfae] bg-warning-50 text-warning", Icon: AlertTriangle },
    success: { cls: "border-[#cfe6dc] bg-brand-green-50 text-brand-green-dark", Icon: CheckCircle2 },
    danger: { cls: "border-[#f7c9c4] bg-danger-50 text-danger", Icon: AlertTriangle },
  }[tone];
  const Icon = map.Icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", map.cls, className)}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : "", "text-ink-strong/90")}>{children}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeading({ title, description, action, id }: { title: string; description?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        <h2 id={id} className="text-2xl font-semibold">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages.at(-1) !== "gap") pages.push("gap");
  }
  const cls = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm";
  return (
    <nav aria-label="Paginação" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(cls, "border-line-strong text-brand-blue hover:bg-brand-blue-50")} rel="prev">
          Anterior
        </Link>
      ) : null}
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`g${i}`} className="px-1 text-muted" aria-hidden="true">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Página ${p}`}
            className={cn(cls, p === page ? "border-brand-blue bg-brand-blue text-white" : "border-line-strong text-brand-blue hover:bg-brand-blue-50")}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(cls, "border-line-strong text-brand-blue hover:bg-brand-blue-50")} rel="next">
          Seguinte
        </Link>
      ) : null}
    </nav>
  );
}

export function MetaList({ items }: { items: { label: string; value: ReactNode }[] }) {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "" && !(Array.isArray(i.value) && i.value.length === 0));
  return (
    <dl className="divide-y divide-line border-y border-line">
      {visible.map((item) => (
        <div key={item.label} className="grid gap-1 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-medium text-muted">{item.label}</dt>
          <dd className="text-ink-strong">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
