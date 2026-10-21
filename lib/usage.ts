import { getDb } from "@/lib/db";
import { badRequest, forbidden } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth";
import { monthBounds, minutesOf } from "@/lib/time";

export interface AreaUsage {
  areaId: number;
  areaName: string;
  confirmed: number;
  pending: number;
  hours: number;
  guests: number;
  daysUsed: number;
  occupancyPercent: number;
}

interface UsageRawRow {
  area_id: number;
  date: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: "pendente" | "confirmada";
}

export function monthlyUsage(actor: AuthUser, month: string): AreaUsage[] {
  if (actor.role !== "sindico") throw forbidden("Somente o síndico pode ver o painel de uso.");
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest("Mês inválido.");
  const { start, end } = monthBounds(month);

  const rows = getDb()
    .prepare(
      `SELECT r.area_id, r.date, r.start_time, r.end_time, r.guests, r.status
         FROM reservations r
        WHERE r.date BETWEEN ? AND ? AND r.status IN ('pendente','confirmada')`,
    )
    .all(start, end) as UsageRawRow[];

  const areas = getDb()
    .prepare("SELECT id, name, open_time, close_time FROM areas ORDER BY id ASC")
    .all() as { id: number; name: string; open_time: string; close_time: string }[];

  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();

  return areas.map((area) => {
    const areaRows = rows.filter((row) => row.area_id === area.id);
    const confirmedRows = areaRows.filter((row) => row.status === "confirmada");
    const hours = confirmedRows.reduce(
      (total, row) => total + (minutesOf(row.end_time) - minutesOf(row.start_time)) / 60,
      0,
    );
    const availableHoursPerDay = (minutesOf(area.close_time) - minutesOf(area.open_time)) / 60;
    const availableHours = availableHoursPerDay * daysInMonth;
    return {
      areaId: area.id,
      areaName: area.name,
      confirmed: confirmedRows.length,
      pending: areaRows.length - confirmedRows.length,
      hours: Math.round(hours * 10) / 10,
      guests: confirmedRows.reduce((total, row) => total + row.guests, 0),
      daysUsed: new Set(confirmedRows.map((row) => row.date)).size,
      occupancyPercent:
        availableHours > 0 ? Math.round((hours / availableHours) * 1000) / 10 : 0,
    };
  });
}
