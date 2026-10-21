import { getDb } from "@/lib/db";
import { conflict, forbidden, notFound } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth";
import { formatCurrencyBR, formatDateBR, nowIso } from "@/lib/time";
import { notifyApartment, notifyRole } from "@/lib/notifications";
import {
  createPaymentRecord,
  type PaymentMethod,
  type PaymentView,
} from "@/lib/payments";

export interface FineView {
  id: number;
  apartmentId: number;
  apartmentLabel: string;
  reservationId: number;
  amountCents: number;
  status: "aberta" | "paga";
  reason: string;
  createdAt: string;
  paidAt: string | null;
  reservationDate: string;
  reservationStart: string;
  reservationEnd: string;
  areaName: string;
}

interface FineDbRow {
  id: number;
  apartment_id: number;
  apartment_label: string;
  reservation_id: number;
  amount_cents: number;
  status: "aberta" | "paga";
  reason: string;
  created_at: string;
  paid_at: string | null;
  reservation_date: string;
  reservation_start: string;
  reservation_end: string;
  area_name: string;
}

const QUERY = `
  SELECT f.*, ap.label AS apartment_label, r.date AS reservation_date,
         r.start_time AS reservation_start, r.end_time AS reservation_end, ar.name AS area_name
    FROM fines f
    JOIN apartments ap ON ap.id = f.apartment_id
    JOIN reservations r ON r.id = f.reservation_id
    JOIN areas ar ON ar.id = r.area_id
`;

function mapFine(row: FineDbRow): FineView {
  return {
    id: row.id,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
    reservationId: row.reservation_id,
    amountCents: row.amount_cents,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    reservationDate: row.reservation_date,
    reservationStart: row.reservation_start,
    reservationEnd: row.reservation_end,
    areaName: row.area_name,
  };
}

export function listOpenFinesForApartment(actor: AuthUser): FineView[] {
  if (actor.role !== "morador" || !actor.apartmentId) {
    throw forbidden("Somente moradores podem consultar as multas do apartamento.");
  }
  const rows = getDb()
    .prepare(`${QUERY} WHERE f.status = 'aberta' AND f.apartment_id = ? ORDER BY f.created_at ASC`)
    .all(actor.apartmentId) as FineDbRow[];
  return rows.map(mapFine);
}

export function listOpenFines(actor: AuthUser): FineView[] {
  if (actor.role !== "sindico") throw forbidden("Somente o síndico pode consultar as multas.");
  const rows = getDb()
    .prepare(`${QUERY} WHERE f.status = 'aberta' ORDER BY f.created_at ASC`)
    .all() as FineDbRow[];
  return rows.map(mapFine);
}

const ALLOWED_METHODS: PaymentMethod[] = ["pix", "cartao", "manual"];

export function payFine(
  actor: AuthUser,
  id: number,
  requestedMethod: PaymentMethod = "manual",
): { fine: FineView; payment: PaymentView } {
  if (actor.role !== "morador" && actor.role !== "sindico") {
    throw forbidden("Somente moradores ou o síndico podem quitar multas.");
  }
  const db = getDb();
  const row = db.prepare(`${QUERY} WHERE f.id = ?`).get(id) as FineDbRow | undefined;
  if (!row) throw notFound("Multa não encontrada.");

  if (actor.role === "morador") {
    if (!actor.apartmentId || row.apartment_id !== actor.apartmentId) {
      throw forbidden("Você só pode pagar multas do seu apartamento.");
    }
  }

  if (row.status === "paga") throw conflict("Esta multa já foi paga.");

  const method: PaymentMethod = actor.role === "sindico" ? "manual" : requestedMethod;
  if (!ALLOWED_METHODS.includes(method)) throw conflict("Forma de pagamento inválida.");

  let payment!: PaymentView;
  const run = db.transaction(() => {
    db.prepare(
      "UPDATE fines SET status = 'paga', paid_at = ?, paid_by = ? WHERE id = ?",
    ).run(nowIso(), actor.id, id);
    payment = createPaymentRecord({
      fineId: row.id,
      apartmentId: row.apartment_id,
      paidBy: actor.id,
      amountCents: row.amount_cents,
      method,
    });
  });
  run();

  const fine = mapFine(db.prepare(`${QUERY} WHERE f.id = ?`).get(id) as FineDbRow);

  notifyApartment(row.apartment_id, {
    type: "multa",
    title: "Multa quitada",
    message: `${row.area_name} em ${formatDateBR(row.reservation_date)} · ${formatCurrencyBR(row.amount_cents)}. O apartamento já pode fazer novas reservas.`,
    link: "/historico",
  });
  if (actor.role !== "sindico") {
    notifyRole("sindico", {
      type: "multa",
      title: "Multa quitada por morador",
      message: `Apto ${row.apartment_label} quitou a multa de ${formatCurrencyBR(row.amount_cents)} referente a ${row.area_name}.`,
      link: "/admin#multas",
    });
  }

  return { fine, payment };
}
