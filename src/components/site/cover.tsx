import { RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { mediaUrl } from "./media";

const ACCENTS: Record<ResourceType, string> = {
  book: "bg-brand-blue",
  article: "bg-brand-green",
  thesis: "bg-brand-blue",
  presentation: "bg-brand-teal",
  report: "bg-brand-green",
  guide: "bg-brand-teal",
  recording: "bg-brand-blue",
  supplementary: "bg-brand-teal",
  institutional: "bg-brand-green",
};

/**
 * Capa do recurso. Sem imagem, apresenta um modelo gráfico com o título e o
 * tipo de documento, em vez de imagens genéricas.
 */
export function Cover({
  coverKey,
  title,
  type,
  size = "md",
  className,
  priority = false,
}: {
  coverKey: string | null;
  title: string;
  type: ResourceType;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}) {
  const url = mediaUrl(coverKey);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Capa de ${title}`}
        width={600}
        height={800}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("aspect-[3/4] w-full rounded-sm border border-line bg-surface object-cover", className)}
      />
    );
  }
  const titleSize = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div
      role="img"
      aria-label={`Capa genérica: ${RESOURCE_TYPE_LABELS[type]}, ${title}`}
      className={cn("relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-sm border border-line bg-brand-blue-50", className)}
    >
      <div className={cn("h-2 w-full", ACCENTS[type])} />
      <div className="flex flex-1 flex-col p-[9%]">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-brand-blue/80">{RESOURCE_TYPE_LABELS[type]}</p>
        <div className={cn("mt-3 h-px w-8", ACCENTS[type])} />
        <p className={cn("mt-3 line-clamp-6 font-heading font-semibold leading-snug text-brand-blue", titleSize)}>{title}</p>
        <p className="mt-auto text-[0.625rem] font-medium uppercase tracking-[0.12em] text-brand-blue/70">Open Lecture4All</p>
      </div>
    </div>
  );
}
