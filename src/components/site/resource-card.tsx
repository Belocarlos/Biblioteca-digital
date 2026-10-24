import Link from "next/link";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import type { ResourceCard as ResourceCardData } from "@/lib/queries/public";
import { Cover } from "./cover";

export function ResourceCard({ resource, headingLevel = 3 }: { resource: ResourceCardData; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const authors = resource.authors.map((a) => a.name);
  const authorText = authors.length > 2 ? `${authors[0]} et al.` : authors.join("; ");
  return (
    <article className="group flex h-full flex-col rounded-md border border-line bg-white transition-colors hover:border-line-strong">
      <div className="border-b border-line bg-surface p-4">
        <div className="mx-auto max-w-[11rem]">
          <Cover coverKey={resource.cover_key} title={resource.title} type={resource.resource_type} size="sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green">{RESOURCE_TYPE_LABELS[resource.resource_type]}</p>
        <Heading className="mt-2 line-clamp-3 text-[1.0625rem] font-semibold leading-snug">
          <Link href={`/biblioteca/${resource.slug}`} className="hover:underline">
            {resource.title}
          </Link>
        </Heading>
        <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <div className="w-full">
            <dt className="sr-only">Autoria</dt>
            <dd className="line-clamp-2 text-ink">{authorText || <span className="text-muted">Autoria não indicada</span>}</dd>
          </div>
          {resource.publication_year ? (
            <div>
              <dt className="sr-only">Ano</dt>
              <dd className="text-muted">{resource.publication_year}</dd>
            </div>
          ) : null}
          {resource.collection ? (
            <div>
              <dt className="sr-only">Área temática</dt>
              <dd className="text-muted">{resource.collection.name}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-auto pt-4">
          <Link
            href={`/biblioteca/${resource.slug}`}
            className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue-50"
            aria-label={`Ver detalhes: ${resource.title}`}
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ResourceGrid({ resources, narrow = false }: { resources: ResourceCardData[]; narrow?: boolean }) {
  return (
    <ul className={narrow ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
      {resources.map((r) => (
        <li key={r.id}>
          <ResourceCard resource={r} />
        </li>
      ))}
    </ul>
  );
}
