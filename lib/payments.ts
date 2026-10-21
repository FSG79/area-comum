import { randomBytes } from "node:crypto";
import { getDb, type PaymentRow } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth";

export type PaymentMethod = "pix" | "cartao" | "manual";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao: "Cartão de crédito",
  manual: "Quitação no painel",
};

export interface PaymentView {
  id: number;
  fineId: number;
  apartmentId: number;
  apartmentLabel: string;
  amountCents: number;
  method: PaymentMethod;
  methodLabel: string;
  receiptCode: string;
  createdAt: string;
  areaName: string;
  reservationDate: string;
}

interface PaymentDbRow extends PaymentRow {
  apartment_label: string;
  area_name: string;
  reservation_date: string;
}

const QUERY = `
  SELECT p.*, ap.label AS apartment_label, ar.name AS area_name, r.date AS reservation_date
    FROM payments p
    JOIN apartments ap ON ap.id = p.apartment_id
    JOIN fines f ON f.id = p.fine_id
    JOIN reservations r ON r.id = f.reservation_id
    JOIN areas ar ON ar.id = r.area_id
`;

function mapPayment(row: PaymentDbRow): PaymentView {
  return {
    id: row.id,
    fineId: row.fine_id,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
    amountCents: row.amount_cents,
    method: row.method,
    methodLabel: PAYMENT_METHOD_LABEL[row.method],
    receiptCode: row.receipt_code,
    createdAt: row.created_at,
    areaName: row.area_name,
    reservationDate: row.reservation_date,
  };
}

export function generateReceiptCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(2).toString("hex").toUpperCase();
  return `SC-${stamp}-${random}`;
}

export function createPaymentRecord(input: {
  fineId: number;
  apartmentId: number;
  paidBy: number;
  amountCents: number;
  method: PaymentMethod;
}): PaymentView {
  const db = getDb();
  const receiptCode = generateReceiptCode();
  const result = db
    .prepare(
      `INSERT INTO payments (fine_id, apartment_id, paid_by, amount_cents, method, receipt_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.fineId,
      input.apartmentId,
      input.paidBy,
      input.amountCents,
      input.method,
      receiptCode,
      new Date().toISOString(),
    );
  const row = db.prepare(`${QUERY} WHERE p.id = ?`).get(Number(result.lastInsertRowid)) as
    | PaymentDbRow
    | undefined;
  if (!row) throw notFound("Pagamento não encontrado.");
  return mapPayment(row);
}

export function getPaymentForFine(fineId: number): PaymentView | null {
  const row = getDb().prepare(`${QUERY} WHERE p.fine_id = ?`).get(fineId) as
    | PaymentDbRow
    | undefined;
  return row ? mapPayment(row) : null;
}

export function listPaymentsForApartment(actor: AuthUser): PaymentView[] {
  if (actor.role !== "morador" || !actor.apartmentId) {
    throw forbidden("Somente moradores podem consultar os pagamentos do apartamento.");
  }
  const rows = getDb()
    .prepare(`${QUERY} WHERE p.apartment_id = ? ORDER BY p.created_at DESC`)
    .all(actor.apartmentId) as PaymentDbRow[];
  return rows.map(mapPayment);
}
