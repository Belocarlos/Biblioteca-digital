export const TIMEZONES: { id: string; label: string }[] = [
  { id: "Europe/Lisbon", label: "hora de Lisboa" },
  { id: "America/Sao_Paulo", label: "hora de Brasília" },
  { id: "Africa/Luanda", label: "hora de Luanda" },
  { id: "Africa/Maputo", label: "hora de Maputo" },
  { id: "Atlantic/Cape_Verde", label: "hora de Cabo Verde" },
  { id: "Africa/Bissau", label: "hora de Bissau" },
  { id: "Africa/Sao_Tome", label: "hora de São Tomé" },
  { id: "Asia/Dili", label: "hora de Díli" },
  { id: "UTC", label: "UTC" },
];

export function timezoneLabel(id: string) {
  return TIMEZONES.find((t) => t.id === id)?.label ?? id;
}

function validTz(tz: string | null | undefined) {
  return TIMEZONES.some((t) => t.id === tz) ? (tz as string) : "Europe/Lisbon";
}

export function formatDate(value: Date | string | null | undefined, timeZone = "Europe/Lisbon") {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: validTz(timeZone) }).format(
    new Date(value),
  );
}

export function formatShortDate(value: Date | string | null | undefined, timeZone = "Europe/Lisbon") {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: validTz(timeZone) }).format(
    new Date(value),
  );
}

export function formatDateTime(value: Date | string | null | undefined, timeZone = "Europe/Lisbon") {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: validTz(timeZone),
  }).format(new Date(value));
}

export function formatTime(value: Date | string | null | undefined, timeZone = "Europe/Lisbon") {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: validTz(timeZone) }).format(new Date(value));
}

/** Converte "AAAA-MM-DDTHH:MM" num fuso horário para um instante UTC. */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMinutes(new Date(guess), validTz(timeZone));
  const result = new Date(guess - offset * 60_000);
  // Ajuste para mudanças de hora próximas do instante calculado.
  const offset2 = tzOffsetMinutes(result, validTz(timeZone));
  return offset2 === offset ? result : new Date(guess - offset2 * 60_000);
}

/** Converte um instante UTC para "AAAA-MM-DDTHH:MM" no fuso indicado (campos datetime-local). */
export function utcToZonedLocal(value: Date | string | null | undefined, timeZone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: validTz(timeZone),
  }).formatToParts(new Date(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function tzOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function formatNumber(n: number) {
  return n.toLocaleString("pt-PT");
}
