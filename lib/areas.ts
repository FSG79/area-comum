import { getDb, type AreaRow } from "@/lib/db";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { isValidTime, minutesOf } from "@/lib/time";
import type { AuthUser } from "@/lib/auth";

export interface AreaView {
  id: number;
  name: string;
  description: string;
  guestLimit: number;
  requiresApproval: boolean;
  minAdvanceDays: number;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export interface AreaInput {
  name: string;
  description: string;
  guestLimit: number;
  requiresApproval: boolean;
  minAdvanceDays: number;
  openTime: string;
  closeTime: string;
}

function mapArea(row: AreaRow): AreaView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    guestLimit: row.guest_limit,
    requiresApproval: Boolean(row.requires_approval),
    minAdvanceDays: row.min_advance_days,
    openTime: row.open_time,
    closeTime: row.close_time,
    active: Boolean(row.active),
  };
}

export function validateAreaInput(input: AreaInput): void {
  if (input.name.length < 2 || input.name.length > 60) {
    throw badRequest("O nome da área deve ter entre 2 e 60 caracteres.");
  }
  if (input.description.length > 300) {
    throw badRequest("A descrição deve ter no máximo 300 caracteres.");
  }
  if (!Number.isInteger(input.guestLimit) || input.guestLimit < 1 || input.guestLimit > 1000) {
    throw badRequest("O limite de convidados deve ser um inteiro entre 1 e 1000.");
  }
  if (
    !Number.isInteger(input.minAdvanceDays) ||
    input.minAdvanceDays < 0 ||
    input.minAdvanceDays > 30
  ) {
    throw badRequest("A antecedência mínima deve ser um inteiro entre 0 e 30 dias.");
  }
  if (!isValidTime(input.openTime) || !isValidTime(input.closeTime)) {
    throw badRequest("Horário de funcionamento inválido.");
  }
  if (minutesOf(input.openTime) >= minutesOf(input.closeTime)) {
    throw badRequest("O horário de abertura deve ser anterior ao de fechamento.");
  }
}

export function listAreas(options: { includeInactive?: boolean } = {}): AreaView[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM areas ${options.includeInactive ? "" : "WHERE active = 1"} ORDER BY id ASC`,
    )
    .all() as AreaRow[];
  return rows.map(mapArea);
}

export function getArea(id: number): AreaView | null {
  const row = getDb().prepare("SELECT * FROM areas WHERE id = ?").get(id) as
    | AreaRow
    | undefined;
  return row ? mapArea(row) : null;
}

export function getAreaByName(name: string): AreaView | null {
  const row = getDb()
    .prepare("SELECT * FROM areas WHERE name = ? COLLATE NOCASE")
    .get(name) as AreaRow | undefined;
  return row ? mapArea(row) : null;
}

function assertSindico(actor: AuthUser) {
  if (actor.role !== "sindico") throw forbidden("Somente o síndico pode cadastrar ou editar áreas.");
}

export function createArea(actor: AuthUser, input: AreaInput): AreaView {
  assertSindico(actor);
  validateAreaInput(input);
  const db = getDb();
  if (getAreaByName(input.name)) throw conflict(`Já existe uma área chamada "${input.name}".`);

  const result = db
    .prepare(
      `INSERT INTO areas
        (name, description, guest_limit, requires_approval, min_advance_days, open_time, close_time, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      input.name,
      input.description,
      input.guestLimit,
      input.requiresApproval ? 1 : 0,
      input.minAdvanceDays,
      input.openTime,
      input.closeTime,
      new Date().toISOString(),
    );
  return getArea(Number(result.lastInsertRowid))!;
}

export function updateArea(actor: AuthUser, id: number, input: AreaInput): AreaView {
  assertSindico(actor);
  validateAreaInput(input);
  const db = getDb();
  if (!getArea(id)) throw notFound("Área não encontrada.");

  const duplicate = db
    .prepare("SELECT id FROM areas WHERE name = ? COLLATE NOCASE AND id <> ?")
    .get(input.name, id) as { id: number } | undefined;
  if (duplicate) throw conflict(`Já existe uma área chamada "${input.name}".`);

  db.prepare(
    `UPDATE areas
        SET name = ?, description = ?, guest_limit = ?, requires_approval = ?,
            min_advance_days = ?, open_time = ?, close_time = ?
      WHERE id = ?`,
  ).run(
    input.name,
    input.description,
    input.guestLimit,
    input.requiresApproval ? 1 : 0,
    input.minAdvanceDays,
    input.openTime,
    input.closeTime,
    id,
  );
  return getArea(id)!;
}
