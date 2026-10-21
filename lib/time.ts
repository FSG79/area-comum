export const APP_TIME_ZONE = "America/Sao_Paulo";
/** Horário de Brasília (sem horário de verão desde 2019). */
export const APP_UTC_OFFSET = "-03:00";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function nowParts(): { date: string; time: string; minutes: number } {
  const parts = Object.fromEntries(
    dateTimeFormatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, minutes: minutesOf(time) };
}

export function todayISO(): string {
  return nowParts().date;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Converte data + hora locais (Brasília) no instante correspondente. */
export function localDateTimeToEpoch(date: string, time: string): number {
  return Date.parse(`${date}T${normalizeTime(time)}:00${APP_UTC_OFFSET}`);
}

export function normalizeTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

export function minutesOf(time: string): number {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  return h * 60 + m;
}

export function timeFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return new Date(parsed).toISOString().slice(0, 10) === date;
}

export function isValidTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const minutes = minutesOf(time);
  return minutes >= 0 && minutes < 24 * 60;
}

/** Diferença em dias de calendário: b - a. */
export function calendarDaysBetween(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T12:00:00Z`);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function addMinutesToEpoch(epoch: number, minutes: number): number {
  return epoch + minutes * 60_000;
}

/** Primeiro e último dia do mês (YYYY-MM). */
export function monthBounds(month: string): { start: string; end: string; label: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function weekdayBR(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDateTimeBR(isoUtc: string | null): string {
  if (!isoUtc) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(isoUtc));
}

export function formatCurrencyBR(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

export function isPastReservation(date: string, startTime: string): boolean {
  return localDateTimeToEpoch(date, startTime) <= Date.now();
}
