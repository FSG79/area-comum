import { getDb, type ReservationRow, type ReservationStatus } from "@/lib/db";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { getArea } from "@/lib/areas";
import type { AuthUser } from "@/lib/auth";
import { notifyApartment, notifyRole } from "@/lib/notifications";
import {
  calendarDaysBetween,
  formatCurrencyBR,
  formatDateBR,
  isValidDate,
  isValidTime,
  localDateTimeToEpoch,
  minutesOf,
  nowIso,
  nowParts,
  todayISO,
} from "@/lib/time";

export interface ReservationView {
  id: number;
  areaId: number;
  areaName: string;
  apartmentId: number;
  apartmentLabel: string;
  residentName: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: ReservationStatus;
  notes: string;
  createdAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  keyDeliveredAt: string | null;
  keyReturnedAt: string | null;
  fineId: number | null;
  fineStatus: "aberta" | "paga" | null;
  fineAmountCents: number | null;
}

interface ReservationDetailRow extends ReservationRow {
  area_name: string;
  apartment_label: string;
  resident_name: string;
  fine_id: number | null;
  fine_status: "aberta" | "paga" | null;
  fine_amount_cents: number | null;
}

export interface CreateReservationInput {
  areaId: number;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  notes: string;
}

const DETAIL_QUERY = `
  SELECT r.*, ar.name AS area_name, ap.label AS apartment_label, u.name AS resident_name,
         f.id AS fine_id, f.status AS fine_status, f.amount_cents AS fine_amount_cents
    FROM reservations r
    JOIN areas ar ON ar.id = r.area_id
    JOIN apartments ap ON ap.id = r.apartment_id
    JOIN users u ON u.id = r.user_id
    LEFT JOIN fines f ON f.reservation_id = r.id
`;

function mapReservation(row: ReservationDetailRow): ReservationView {
  return {
    id: row.id,
    areaId: row.area_id,
    areaName: row.area_name,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
    residentName: row.resident_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    guests: row.guests,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    cancelledAt: row.cancelled_at,
    keyDeliveredAt: row.key_delivered_at,
    keyReturnedAt: row.key_returned_at,
    fineId: row.fine_id,
    fineStatus: row.fine_status,
    fineAmountCents: row.fine_amount_cents,
  };
}

function getReservationDetail(id: number): ReservationView | null {
  const row = getDb().prepare(`${DETAIL_QUERY} WHERE r.id = ?`).get(id) as
    | ReservationDetailRow
    | undefined;
  return row ? mapReservation(row) : null;
}

function assertMorador(actor: AuthUser): asserts actor is AuthUser & { apartmentId: number } {
  if (actor.role !== "morador" || !actor.apartmentId) {
    throw forbidden("Somente moradores podem fazer ou cancelar reservas.");
  }
}

function assertSindico(actor: AuthUser) {
  if (actor.role !== "sindico") throw forbidden("Somente o síndico pode aprovar ou recusar reservas.");
}

function assertPorteiro(actor: AuthUser) {
  if (actor.role !== "porteiro") throw forbidden("Somente a portaria pode registrar a chave.");
}

function assertTodayForPorteiro(actor: AuthUser, date: string) {
  if (actor.role === "porteiro" && date !== todayISO()) {
    throw forbidden("A portaria só tem acesso às reservas do dia.");
  }
}

export function listDay(actor: AuthUser, date: string, areaId?: number): ReservationView[] {
  if (!isValidDate(date)) throw badRequest("Data inválida.");
  assertTodayForPorteiro(actor, date);
  const db = getDb();
  const params: (string | number)[] = [date];
  let where = "WHERE r.date = ? AND r.status IN ('pendente','confirmada')";
  if (areaId) {
    where += " AND r.area_id = ?";
    params.push(areaId);
  }
  const rows = db
    .prepare(`${DETAIL_QUERY} ${where} ORDER BY r.start_time ASC, ar.name ASC`)
    .all(...params) as ReservationDetailRow[];
  return rows.map(mapReservation);
}

export function listAreaDay(actor: AuthUser, areaId: number, date: string): ReservationView[] {
  return listDay(actor, date, areaId);
}

export function listUpcomingForApartment(actor: AuthUser): ReservationView[] {
  assertMorador(actor);
  const { date: today, time: nowTime } = nowParts();
  const rows = getDb()
    .prepare(
      `${DETAIL_QUERY}
        WHERE r.apartment_id = ?
          AND r.status IN ('pendente','confirmada')
          AND (r.date > ? OR (r.date = ? AND r.end_time > ?))
        ORDER BY r.date ASC, r.start_time ASC`,
    )
    .all(actor.apartmentId, today, today, nowTime) as ReservationDetailRow[];
  return rows.map(mapReservation);
}

export function listHistoryForApartment(actor: AuthUser): ReservationView[] {
  assertMorador(actor);
  const rows = getDb()
    .prepare(
      `${DETAIL_QUERY}
        WHERE r.apartment_id = ?
        ORDER BY r.date DESC, r.start_time DESC, r.id DESC`,
    )
    .all(actor.apartmentId) as ReservationDetailRow[];
  return rows.map(mapReservation);
}

export function listPendingForSindico(actor: AuthUser): ReservationView[] {
  assertSindico(actor);
  const rows = getDb()
    .prepare(
      `${DETAIL_QUERY}
        WHERE r.status = 'pendente'
        ORDER BY r.date ASC, r.start_time ASC`,
    )
    .all() as ReservationDetailRow[];
  return rows.map(mapReservation);
}

export function listTodayForPorteiro(actor: AuthUser): ReservationView[] {
  assertPorteiro(actor);
  const rows = getDb()
    .prepare(
      `${DETAIL_QUERY}
        WHERE r.date = ? AND r.status = 'confirmada'
        ORDER BY r.start_time ASC, ar.name ASC`,
    )
    .all(todayISO()) as ReservationDetailRow[];
  return rows.map(mapReservation);
}

export function createReservation(
  actor: AuthUser,
  input: CreateReservationInput,
): ReservationView {
  assertMorador(actor);
  const area = getArea(input.areaId);
  if (!area || !area.active) throw notFound("Área não encontrada ou inativa.");

  if (!isValidDate(input.date)) throw badRequest("Data inválida.");
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
    throw badRequest("Horário inválido.");
  }
  if (minutesOf(input.startTime) >= minutesOf(input.endTime)) {
    throw badRequest("O horário de início deve ser anterior ao de término.");
  }
  if (
    minutesOf(input.startTime) < minutesOf(area.openTime) ||
    minutesOf(input.endTime) > minutesOf(area.closeTime)
  ) {
    throw badRequest(
      `A área "${area.name}" funciona das ${area.openTime} às ${area.closeTime}. Escolha um horário dentro desse período.`,
    );
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw badRequest("Informe o número de convidados.");
  }
  if (input.guests > area.guestLimit) {
    throw badRequest(
      `A área "${area.name}" aceita no máximo ${area.guestLimit} convidados. Você informou ${input.guests}.`,
    );
  }

  const startEpoch = localDateTimeToEpoch(input.date, input.startTime);
  if (startEpoch <= Date.now()) {
    throw badRequest("A reserva precisa ser para um horário futuro.");
  }

  if (area.minAdvanceDays > 0) {
    const daysAhead = calendarDaysBetween(todayISO(), input.date);
    if (daysAhead < area.minAdvanceDays) {
      throw badRequest(
        `A área "${area.name}" exige pelo menos ${area.minAdvanceDays} dias de antecedência. A data escolhida tem ${Math.max(daysAhead, 0)} dia(s) de antecedência.`,
      );
    }
  }

  const db = getDb();
  const block = db
    .prepare("SELECT reason FROM maintenance_blocks WHERE area_id = ? AND date = ?")
    .get(area.id, input.date) as { reason: string } | undefined;
  if (block) {
    throw conflict(
      `A área "${area.name}" está bloqueada para manutenção em ${formatDateBR(input.date)}${block.reason ? ` (${block.reason})` : ""}.`,
    );
  }

  const openFine = db
    .prepare(
      "SELECT id, amount_cents FROM fines WHERE apartment_id = ? AND status = 'aberta' LIMIT 1",
    )
    .get(actor.apartmentId) as { id: number; amount_cents: number } | undefined;
  if (openFine) {
    throw conflict(
      `O apartamento ${actor.apartmentLabel ?? ""} tem uma multa em aberto de ${formatCurrencyBR(openFine.amount_cents)}. Regularize com o síndico antes de fazer uma nova reserva.`,
    );
  }

  const clash = db
    .prepare(
      `SELECT r.start_time, r.end_time, ap.label AS apartment_label
         FROM reservations r
         JOIN apartments ap ON ap.id = r.apartment_id
        WHERE r.area_id = ? AND r.date = ?
          AND r.status IN ('pendente','confirmada')
          AND r.start_time < ? AND r.end_time > ?
        LIMIT 1`,
    )
    .get(area.id, input.date, input.endTime, input.startTime) as
    | { start_time: string; end_time: string; apartment_label: string }
    | undefined;
  if (clash) {
    throw conflict(
      `Já existe reserva na "${area.name}" em ${formatDateBR(input.date)} das ${clash.start_time} às ${clash.end_time}. Escolha outro horário.`,
    );
  }

  const { date: today, time: nowTime } = nowParts();
  const futureCount = db
    .prepare(
      `SELECT COUNT(*) AS total FROM reservations
        WHERE apartment_id = ? AND status IN ('pendente','confirmada')
          AND (date > ? OR (date = ? AND start_time > ?))`,
    )
    .get(actor.apartmentId, today, today, nowTime) as { total: number };
  if (futureCount.total >= 2) {
    throw conflict(
      "O apartamento já tem duas reservas futuras. Cancele uma delas para poder reservar novamente.",
    );
  }

  const status: ReservationStatus = area.requiresApproval ? "pendente" : "confirmada";
  const result = db
    .prepare(
      `INSERT INTO reservations
        (area_id, apartment_id, user_id, date, start_time, end_time, guests, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      area.id,
      actor.apartmentId,
      actor.id,
      input.date,
      input.startTime,
      input.endTime,
      input.guests,
      status,
      input.notes,
      nowIso(),
    );

  const created = getReservationDetail(Number(result.lastInsertRowid))!;

  notifyApartment(actor.apartmentId, {
    type: "reserva",
    title: status === "pendente" ? "Solicitação de reserva enviada" : "Reserva confirmada",
    message: `${area.name} · ${formatDateBR(input.date)} · ${input.startTime}–${input.endTime}${
      status === "pendente" ? " · aguardando aprovação do síndico" : ""
    }`,
    link: "/minhas",
  });
  if (status === "pendente") {
    notifyRole("sindico", {
      type: "aprovacao",
      title: "Nova solicitação de reserva",
      message: `Apto ${actor.apartmentLabel} · ${area.name} em ${formatDateBR(input.date)}, ${input.startTime}–${input.endTime}.`,
      link: "/admin#aprovacoes",
    });
  }

  return created;
}

export function cancelReservation(
  actor: AuthUser,
  reservationId: number,
): { reservation: ReservationView; fineCreated: boolean; fineAmountCents: number } {
  assertMorador(actor);
  const reservation = getReservationDetail(reservationId);
  if (!reservation) throw notFound("Reserva não encontrada.");
  if (reservation.apartmentId !== actor.apartmentId) {
    throw forbidden("Você só pode cancelar reservas do seu apartamento.");
  }
  if (reservation.status !== "pendente" && reservation.status !== "confirmada") {
    throw conflict("Esta reserva não pode mais ser cancelada.");
  }

  const startEpoch = localDateTimeToEpoch(reservation.date, reservation.startTime);
  if (startEpoch <= Date.now()) {
    throw conflict("Não é possível cancelar uma reserva que já começou ou já passou.");
  }

  const db = getDb();
  const lessThan24h = startEpoch - Date.now() < 24 * 60 * 60 * 1000;
  const fineAmountCents = 5000;

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE reservations
          SET status = 'cancelada', cancelled_at = ?, cancelled_by = ?
        WHERE id = ?`,
    ).run(nowIso(), actor.id, reservationId);

    if (lessThan24h) {
      const existingFine = db
        .prepare("SELECT id FROM fines WHERE reservation_id = ?")
        .get(reservationId) as { id: number } | undefined;
      if (!existingFine) {
        db.prepare(
          `INSERT INTO fines
             (apartment_id, reservation_id, amount_cents, status, reason, created_at)
           VALUES (?, ?, ?, 'aberta', ?, ?)`,
        ).run(
          reservation.apartmentId,
          reservationId,
          fineAmountCents,
          "Cancelamento com menos de 24 horas de antecedência.",
          nowIso(),
        );
      }
    }
  });
  run();

  const cancelled = getReservationDetail(reservationId)!;
  notifyApartment(reservation.apartmentId, {
    type: "reserva",
    title: "Reserva cancelada",
    message: `${reservation.areaName} em ${formatDateBR(reservation.date)}, ${reservation.startTime}–${reservation.endTime}${
      lessThan24h ? " · multa de R$ 50,00 gerada" : ""
    }.`,
    link: "/historico",
  });
  if (lessThan24h) {
    notifyRole("sindico", {
      type: "multa",
      title: "Nova multa gerada",
      message: `Apto ${reservation.apartmentLabel} · ${formatCurrencyBR(fineAmountCents)} · ${reservation.areaName} em ${formatDateBR(reservation.date)}.`,
      link: "/admin#multas",
    });
  }

  return {
    reservation: cancelled,
    fineCreated: lessThan24h,
    fineAmountCents: lessThan24h ? fineAmountCents : 0,
  };
}

export function decideReservation(
  actor: AuthUser,
  reservationId: number,
  decision: "aprovar" | "recusar",
): ReservationView {
  assertSindico(actor);
  const reservation = getReservationDetail(reservationId);
  if (!reservation) throw notFound("Reserva não encontrada.");
  if (reservation.status !== "pendente") {
    throw conflict("Somente reservas pendentes podem ser aprovadas ou recusadas.");
  }

  const db = getDb();
  if (decision === "aprovar") {
    const block = db
      .prepare("SELECT reason FROM maintenance_blocks WHERE area_id = ? AND date = ?")
      .get(reservation.areaId, reservation.date) as { reason: string } | undefined;
    if (block) {
      throw conflict("A área está bloqueada para manutenção nessa data. Recuse a reserva.");
    }
    const clash = db
      .prepare(
        `SELECT id, start_time, end_time FROM reservations
          WHERE area_id = ? AND date = ? AND id <> ?
            AND status IN ('pendente','confirmada')
            AND start_time < ? AND end_time > ?
          LIMIT 1`,
      )
      .get(
        reservation.areaId,
        reservation.date,
        reservation.id,
        reservation.endTime,
        reservation.startTime,
      ) as { id: number; start_time: string; end_time: string } | undefined;
    if (clash) {
      throw conflict(
        `Há outra reserva no mesmo horário (${clash.start_time}–${clash.end_time}). Recuse esta solicitação.`,
      );
    }
    db.prepare(
      "UPDATE reservations SET status = 'confirmada', decided_by = ?, decided_at = ? WHERE id = ?",
    ).run(actor.id, nowIso(), reservationId);
  } else {
    db.prepare(
      "UPDATE reservations SET status = 'recusada', decided_by = ?, decided_at = ? WHERE id = ?",
    ).run(actor.id, nowIso(), reservationId);
  }

  const decided = getReservationDetail(reservationId)!;
  notifyApartment(decided.apartmentId, {
    type: "reserva",
    title: decision === "aprovar" ? "Reserva aprovada" : "Reserva recusada",
    message: `${decided.areaName} em ${formatDateBR(decided.date)}, ${decided.startTime}–${decided.endTime}.`,
    link: "/minhas",
  });
  return decided;
}

export function registerKeyEvent(
  actor: AuthUser,
  reservationId: number,
  action: "entrega" | "devolucao",
): ReservationView {
  assertPorteiro(actor);
  const reservation = getReservationDetail(reservationId);
  if (!reservation) throw notFound("Reserva não encontrada.");
  if (reservation.date !== todayISO()) {
    throw forbidden("A portaria só pode registrar chaves das reservas do dia.");
  }
  if (reservation.status !== "confirmada") {
    throw conflict("Somente reservas confirmadas têm controle de chave.");
  }

  const db = getDb();
  if (action === "entrega") {
    if (!reservation.keyDeliveredAt) {
      db.prepare("UPDATE reservations SET key_delivered_at = ? WHERE id = ?").run(
        nowIso(),
        reservationId,
      );
    }
  } else {
    if (!reservation.keyDeliveredAt) {
      throw conflict("Registre a entrega da chave antes de registrar a devolução.");
    }
    if (!reservation.keyReturnedAt) {
      db.prepare("UPDATE reservations SET key_returned_at = ? WHERE id = ?").run(
        nowIso(),
        reservationId,
      );
    }
  }
  const updated = getReservationDetail(reservationId)!;
  notifyApartment(updated.apartmentId, {
    type: "chave",
    title: action === "entrega" ? "Chave entregue pela portaria" : "Chave devolvida à portaria",
    message: `${updated.areaName} · ${updated.startTime}–${updated.endTime}.`,
    link: "/historico",
  });
  return updated;
}

export function countPending(actor: AuthUser): number {
  assertSindico(actor);
  return (
    getDb().prepare("SELECT COUNT(*) AS total FROM reservations WHERE status = 'pendente'").get() as {
      total: number;
    }
  ).total;
}
