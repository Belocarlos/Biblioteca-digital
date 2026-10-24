import Link from "next/link";
import { UserRound } from "lucide-react";
import type { AuthorCard as AuthorCardData } from "@/lib/queries/public";
import { mediaUrl } from "./media";

export function AuthorPhoto({ photoKey, alt, className = "h-16 w-16" }: { photoKey: string | null; alt: string; className?: string }) {
  const url = mediaUrl(photoKey);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} width={160} height={160} loading="lazy" className={`${className} shrink-0 rounded-md border border-line object-cover`} />;
  }
  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-md border border-line bg-surface text-muted`} aria-hidden="true">
      <UserRound className="h-1/2 w-1/2 stroke-[1.25]" />
    </div>
  );
}

export function AuthorCard({ author }: { author: AuthorCardData }) {
  const counts = [
    author.resource_count ? `${author.resource_count} ${author.resource_count === 1 ? "publicação" : "publicações"}` : null,
    author.session_count ? `${author.session_count} ${author.session_count === 1 ? "sessão" : "sessões"}` : null,
  ].filter(Boolean);
  return (
    <article className="flex h-full gap-4 rounded-md border border-line bg-white p-4">
      <AuthorPhoto photoKey={author.photo_key} alt={author.photo_alt || `Fotografia de ${author.name}`} />
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-snug">
          <Link href={`/autores/${author.slug}`} className="hover:underline">
            {author.name}
          </Link>
        </h3>
        {author.specialization ? <p className="mt-1 text-sm text-ink">{author.specialization}</p> : null}
        {author.institution || author.country ? (
          <p className="mt-0.5 text-sm text-muted">{[author.institution, author.country].filter(Boolean).join(", ")}</p>
        ) : null}
        {counts.length ? <p className="mt-2 text-xs font-medium text-brand-green">{counts.join(" · ")}</p> : null}
      </div>
    </article>
  );
}
