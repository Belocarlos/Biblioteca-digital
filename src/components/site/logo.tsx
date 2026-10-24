import { cn } from "@/lib/cn";

/**
 * Monograma provisório OL4. Deve ser substituído pelo logótipo oficial
 * do Open Lecture4All quando este for fornecido.
 */
export function Monogram({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="32" height="32" rx="6" fill="#163A5F" />
      <circle cx="9" cy="15" r="4.6" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
      <path d="M15.6 10.2V19.6H20.6" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="square" />
      <path d="M27.4 17.2H22.4L26.2 10.2V20.4" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="miter" strokeLinecap="square" />
      <rect x="4.4" y="24" width="23.2" height="2.2" fill="#287D62" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <Monogram className="h-10 w-10 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-heading text-[1.0625rem] font-semibold tracking-tight", inverted ? "text-white" : "text-brand-blue")}>
          Biblioteca Digital
        </span>
        <span className={cn("mt-1 text-[0.8125rem] font-medium", inverted ? "text-white/80" : "text-brand-green")}>Open Lecture4All</span>
      </span>
    </span>
  );
}
