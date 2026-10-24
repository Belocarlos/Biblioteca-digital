import Link from "next/link";
import type { AuthorRef } from "@/lib/queries/public";

/** Lista de autores, com ligação para o perfil quando este está publicado. */
export function AuthorNames({ authors, linked = true, max }: { authors: AuthorRef[]; linked?: boolean; max?: number }) {
  if (!authors.length) return <span className="text-muted">Autoria não indicada</span>;
  const shown = max ? authors.slice(0, max) : authors;
  const rest = max ? authors.length - shown.length : 0;
  return (
    <>
      {shown.map((a, i) => (
        <span key={a.slug}>
          {i > 0 ? "; " : ""}
          {linked && a.is_published ? (
            <Link href={`/autores/${a.slug}`} className="link">
              {a.name}
            </Link>
          ) : (
            a.name
          )}
        </span>
      ))}
      {rest > 0 ? <span> et al.</span> : null}
    </>
  );
}
