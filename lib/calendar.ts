import { getDb } from "@/lib/db";
import { badRequest, forbidden } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth";
import { formatDateBR, monthBounds, todayISO } from "@/lib/time";

export interface CalendarAreaCount {
  areaId: number;
  areaName: string;
  count: number;
}

export interface CalendarDayData {
  date: string;
  total: number;
  confirmed: number;
  pending: number;
  areas: CalendarAreaCount[];
  blockedAreaIds: number[];
}

export interface MonthCalendarData {
  month: string;
  label: string;
  firstWeekday: number;
  daysInMonth: number;
  today: string;
  days: Record<string, CalendarDayData>;
  areas: { id: number; name: string }[];
}

interface DayRow {
  date: string;
  area_id: number;
  area_name: string;
  status: "pendente" | "confirmada";
}

interface StripDay {
  date: string;
  total: number;
  blocked: boolean;
  isToday: boolean;
}

function assertCanSeeAgenda(actor: AuthUser) {
  if (actor.role !== "morador" && actor.role !== "sindico") {
    throw forbidden("A agenda completa é exclusiva de moradores e do síndico.");
  }
}

export function getMonthCalendar(actor: AuthUser, month: string): MonthCalendarData {
  assertCanSeeAgenda(actor);
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest("Mês inválido.");
  const { start, end, label } = monthBounds(month);
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT r.date, r.area_id, ar.name AS area_name, r.status
         FROM reservations r
         JOIN areas ar ON ar.id = r.area_id
        WHERE r.date BETWEEN ? AND ? AND r.status IN ('pendente','confirmada')
        ORDER BY r.start_time ASC`,
    )
    .all(start, end) as DayRow[];

  const blocks = db
    .prepare(
      "SELECT area_id, date FROM maintenance_blocks WHERE date BETWEEN ? AND ?",
    )
    .all(start, end) as { area_id: number; date: string }[];

  const days: Record<string, CalendarDayData> = {};

  const dayFor = (date: string): CalendarDayData => {
    if (!days[date]) {
      days[date] = {
        date,
        total: 0,
        confirmed: 0,
        pending: 0,
        areas: [],
        blockedAreaIds: [],
      };
    }
    return days[date];
  };

  for (const row of rows) {
    const day = dayFor(row.date);
    day.total += 1;
    if (row.status === "confirmada") day.confirmed += 1;
    else day.pending += 1;
    const existing = day.areas.find((area) => area.areaId === row.area_id);
    if (existing) existing.count += 1;
    else day.areas.push({ areaId: row.area_id, areaName: row.area_name, count: 1 });
  }

  for (const block of blocks) {
    const day = dayFor(block.date);
    if (!day.blockedAreaIds.includes(block.area_id)) day.blockedAreaIds.push(block.area_id);
  }

  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();

  const firstWeekday = new Date(`${month}-01T12:00:00Z`).getUTCDay();

  const areas = db.prepare("SELECT id, name FROM areas WHERE active = 1 ORDER BY id").all() as {
    id: number;
    name: string;
  }[];

  return {
    month,
    label,
    firstWeekday,
    daysInMonth,
    today: todayISO(),
    days,
    areas,
  };
}

export function getAreaStrip(
  actor: AuthUser,
  areaId: number,
  startDate: string,
  count = 21,
): StripDay[] {
  assertCanSeeAgenda(actor);
  const start = startDate;
  const end = new Date(Date.parse(`${startDate}T12:00:00Z`) + (count - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT date, COUNT(*) AS total FROM reservations
        WHERE area_id = ? AND date BETWEEN ? AND ? AND status IN ('pendente','confirmada')
        GROUP BY date`,
    )
    .all(areaId, start, end) as { date: string; total: number }[];
  const blocks = db
    .prepare("SELECT date FROM maintenance_blocks WHERE area_id = ? AND date BETWEEN ? AND ?")
    .all(areaId, start, end) as { date: string }[];

  const byDate = new Map(rows.map((row) => [row.date, row.total]));
  const blocked = new Set(blocks.map((row) => row.date));
  const today = todayISO();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.parse(`${startDate}T12:00:00Z`) + index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      total: byDate.get(date) ?? 0,
      blocked: blocked.has(date),
      isToday: date === today,
    };
  });
}

export function calendarDayLabel(date: string): string {
  return formatDateBR(date);
}
