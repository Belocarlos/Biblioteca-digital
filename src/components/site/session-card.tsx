import Link from "next/link";
import { CalendarDays, Mic } from "lucide-react";
import { EVENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatTime, timezoneLabel } from "@/lib/format";
import type { SessionCard as SessionCardData } from "@/lib/queries/public";
import { Badge } from "@/components/ui/misc";
import { mediaUrl } from "./media";

export function EventStatusBadge({ status }: { status: SessionCardData["event_status"] }) {
  const tone = status === "held" ? "green" : status === "scheduled" ? "blue" : status === "cancelled" ? "danger" : "warning";
  return <Badge tone={tone}>{EVENT_STATUS_LABELS[status]}</Badge>;
}

export function SessionCard({ session }: { session: SessionCardData }) {
  const poster = mediaUrl(session.poster_key);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-white sm:flex-row">
      <div className="shrink-0 border-b border-line bg-surface sm:w-40 sm:border-b-0 sm:border-r">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={session.poster_alt || `Cartaz da sessão ${session.title}`}
            width={320}
            height={400}
            loading="lazy"
            className="aspect-[4/5] h-full w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-muted max-sm:aspect-[3/1]">
            <Mic aria-hidden="true" className="h-6 w-6 stroke-[1.5]" />
            <span className="text-xs">Cartaz não disponível</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-green">Saberes em Rede</p>
          <EventStatusBadge status={session.event_status} />
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug">
          <Link href={`/sessoes/${session.slug}`} className="hover:underline">
            {session.title}
          </Link>
        </h3>
        {session.starts_at ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-muted" />
            <span>
              {formatDate(session.starts_at, session.timezone)}, {formatTime(session.starts_at, session.timezone)} ({timezoneLabel(session.timezone)})
            </span>
          </p>
        ) : null}
        {session.speakers.length ? (
          <p className="mt-1 text-sm text-muted">
            <span className="sr-only">Oradores: </span>
            {session.speakers.map((s) => s.name).join(", ")}
          </p>
        ) : null}
        {session.summary ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink">{session.summary}</p> : null}
        <div className="mt-auto pt-4">
          <Link href={`/sessoes/${session.slug}`} className="link text-sm font-medium" aria-label={`Consultar sessão: ${session.title}`}>
            Consultar sessão
          </Link>
        </div>
      </div>
    </article>
  );
}
