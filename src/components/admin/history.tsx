import { EDITORIAL_STATUS_LABELS, type EditorialStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { HistoryEntry } from "@/lib/queries/admin";

export function EditorialHistory({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted">Ainda não existem alterações de estado.</p>;
  return (
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="border-l-2 border-line pl-3 text-sm">
          <p className="font-medium text-ink-strong">
            {e.from_status ? `${EDITORIAL_STATUS_LABELS[e.from_status as EditorialStatus]} para ` : ""}
            {EDITORIAL_STATUS_LABELS[e.to_status as EditorialStatus]}
          </p>
          <p className="text-xs text-muted">
            {formatDateTime(e.created_at)}
            {e.actor ? ` · ${e.actor}` : ""}
          </p>
          {e.note ? <p className="mt-1 text-ink">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
