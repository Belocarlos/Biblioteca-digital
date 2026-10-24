import "server-only";
import type { Tx } from "../db";

export async function pickerOptions(tx: Tx) {
  const [authors, collections, sessions, resources] = await Promise.all([
    tx<{ id: string; label: string; hint: string | null }[]>`
      select id, name as label, nullif(concat_ws(', ', institution, country), '') as hint from authors order by name`,
    tx<{ id: string; name: string }[]>`select id, name from collections order by position, name`,
    tx<{ id: string; label: string; hint: string | null }[]>`
      select id, title as label, to_char(starts_at at time zone timezone, 'DD/MM/YYYY') as hint from program_sessions order by starts_at desc nulls last`,
    tx<{ id: string; label: string; hint: string | null }[]>`
      select id, title as label, concat_ws(' · ', publication_year::text, status::text) as hint from resources order by updated_at desc`,
  ]);
  return { authors, collections, sessions, resources };
}

export type HistoryEntry = { id: number; from_status: string | null; to_status: string; note: string | null; created_at: Date; actor: string | null };

export async function editorialHistory(tx: Tx, entityType: "resource" | "session", entityId: string) {
  return tx<HistoryEntry[]>`
    select e.id, e.from_status, e.to_status, e.note, e.created_at, u.name as actor
    from editorial_events e left join users u on u.id = e.actor_id
    where e.entity_type = ${entityType} and e.entity_id = ${entityId}
    order by e.created_at desc`;
}
