import { getDb } from "@/lib/db";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth";
import { notifyRole } from "@/lib/notifications";
import { formatDateBR, isValidDate, todayISO } from "@/lib/time";

export interface BlockView {
  id: number;
  areaId: number;
  areaName: string;
  date: string;
  reason: string;
  createdAt: string;
}

interface BlockDbRow {
  id: number;
  area_id: number;
  area_name: string;
  date: string;
  reason: string;
  created_at: string;
}

const LIST_QUERY = `
  SELECT b.*, ar.name AS area_name
    FROM maintenance_blocks b
    JOIN areas ar ON ar.id = b.area_id
`;

function mapBlock(row: BlockDbRow): BlockView {
  return {
    id: row.id,
    areaId: row.area_id,
    areaName: row.area_name,
    date: row.date,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function assertSindico(actor: AuthUser) {
  if (actor.role !== "sindico") throw forbidden("Somente o síndico pode gerenciar bloqueios.");
}

export function listBlocksForDate(date: string): BlockView[] {
  const rows = getDb()
    .prepare(`${LIST_QUERY} WHERE b.date = ? ORDER BY ar.name ASC`)
    .all(date) as BlockDbRow[];
  return rows.map(mapBlock);
}

export function listUpcomingBlocks(actor: AuthUser): BlockView[] {
  assertSindico(actor);
  const rows = getDb()
    .prepare(`${LIST_QUERY} WHERE b.date >= ? ORDER BY b.date ASC, ar.name ASC`)
    .all(todayISO()) as BlockDbRow[];
  return rows.map(mapBlock);
}

export function createBlock(
  actor: AuthUser,
  input: { areaId: number; date: string; reason: string },
): BlockView {
  assertSindico(actor);
  if (!isValidDate(input.date)) throw badRequest("Data inválida.");
  if (input.date < todayISO()) throw badRequest("Não é possível bloquear uma data que já passou.");
  if (input.reason.length > 200) throw badRequest("O motivo deve ter no máximo 200 caracteres.");

  const db = getDb();
  const area = db.prepare("SELECT id, name FROM areas WHERE id = ?").get(input.areaId) as
    | { id: number; name: string }
    | undefined;
  if (!area) throw notFound("Área não encontrada.");

  const existing = db
    .prepare("SELECT id FROM maintenance_blocks WHERE area_id = ? AND date = ?")
    .get(input.areaId, input.date) as { id: number } | undefined;
  if (existing) throw conflict("Esta área já está bloqueada nessa data.");

  const reservation = db
    .prepare(
      `SELECT COUNT(*) AS total FROM reservations
        WHERE area_id = ? AND date = ? AND status IN ('pendente','confirmada')`,
    )
    .get(input.areaId, input.date) as { total: number };
  if (reservation.total > 0) {
    throw conflict(
      `Existem ${reservation.total} reserva(s) ativa(s) na "${area.name}" em ${formatDateBR(input.date)}. Cancele-as antes de bloquear a data para manutenção.`,
    );
  }

  const result = db
    .prepare(
      "INSERT INTO maintenance_blocks (area_id, date, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(input.areaId, input.date, input.reason, actor.id, new Date().toISOString());

  const row = db
    .prepare(`${LIST_QUERY} WHERE b.id = ?`)
    .get(Number(result.lastInsertRowid)) as BlockDbRow;

  notifyRole("morador", {
    type: "manutencao",
    title: "Manutenção programada",
    message: `${area.name} bloqueada em ${formatDateBR(input.date)}${input.reason ? ` · ${input.reason}` : ""}.`,
    link: "/agenda",
  });

  return mapBlock(row);
}

export function deleteBlock(actor: AuthUser, id: number): void {
  assertSindico(actor);
  const result = getDb().prepare("DELETE FROM maintenance_blocks WHERE id = ?").run(id);
  if (result.changes === 0) throw notFound("Bloqueio não encontrado.");
}
