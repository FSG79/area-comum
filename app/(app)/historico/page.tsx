import type { Metadata } from "next";
import Link from "next/link";
import { AreaIcon } from "@/components/AreaIcon";
import { PaymentDialog } from "@/components/PaymentDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { listOpenFinesForApartment } from "@/lib/fines";
import { listPaymentsForApartment, PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { listHistoryForApartment } from "@/lib/reservations";
import {
  formatCurrencyBR,
  formatDateBR,
  formatDateTimeBR,
  weekdayBR,
} from "@/lib/time";

export const metadata: Metadata = { title: "Histórico · Condomínio Exemplo" };

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export default async function HistoryPage() {
  const user = await requireUser(["morador"]);
  const reservations = listHistoryForApartment(user);
  const openFines = listOpenFinesForApartment(user);
  const payments = listPaymentsForApartment(user);
  const openFineTotal = openFines.reduce((total, fine) => total + fine.amountCents, 0);
  const paidTotal = payments.reduce((total, payment) => total + payment.amountCents, 0);
  const paymentByFine = new Map(payments.map((payment) => [payment.fineId, payment]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Apartamento {user.apartmentLabel}</p>
          <h1 className="mt-2 font-display text-[2.7rem] font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
            Histórico do
            <br />
            <em className="text-gold-600">apartamento.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Reservas, cancelamentos, multas e pagamentos compartilhados por todos os moradores do
            apto {user.apartmentLabel}. Visível apenas para os moradores deste apartamento.
          </p>
        </div>
        <Link href="/agenda" className="btn-gold">
          Reservar nova área
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card px-5 py-4">
          <p className="stat-value">{reservations.length}</p>
          <p className="stat-label">Reservas no histórico</p>
        </div>
        <div className="card px-5 py-4">
          <p className={`stat-value ${openFineTotal > 0 ? "text-rose-600" : ""}`}>
            {formatCurrencyBR(openFineTotal)}
          </p>
          <p className="stat-label">Multas em aberto</p>
        </div>
        <div className="card px-5 py-4">
          <p className="stat-value">{formatCurrencyBR(paidTotal)}</p>
          <p className="stat-label">Multas pagas</p>
        </div>
      </div>

      {openFineTotal > 0 ? (
        <section className="card border-rose-200/80 bg-rose-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Multa em aberto · {formatCurrencyBR(openFineTotal)}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                Multas em aberto impedem novas reservas. Pague pelo PIX simulado ou cartão para
                liberar o apartamento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {openFines.map((fine) => (
                <PaymentDialog
                  key={fine.id}
                  fineId={fine.id}
                  amountCents={fine.amountCents}
                  areaName={fine.areaName}
                  reservationDate={formatDateBR(fine.reservationDate)}
                  label="Pagar multa"
                />
              ))}
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-[11px] text-rose-800">
            {openFines.map((fine) => (
              <li key={fine.id}>
                {fine.areaName} em {formatDateBR(fine.reservationDate)} ·{" "}
                {formatCurrencyBR(fine.amountCents)} · {fine.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reservations.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink-800">
            Ainda não há reservas para este apartamento.
          </p>
          <Link href="/agenda" className="btn-gold mt-4">
            Ver agenda
          </Link>
        </div>
      ) : (
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Todas as movimentações</p>
              <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
                Reservas do apartamento
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-300">
              Ordenadas da mais recente para a mais antiga
            </span>
          </div>

          <ul className="mt-5 divide-y divide-line/70">
            {reservations.map((reservation) => {
              const payment = reservation.fineId ? paymentByFine.get(reservation.fineId) : null;
              return (
                <li key={reservation.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-200/70 text-ink-800">
                      <span className="font-display text-xl leading-none">
                        {reservation.date.slice(8, 10)}
                      </span>
                      <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-ink-400">
                        {MONTHS[Number(reservation.date.slice(5, 7)) - 1]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AreaIcon name={reservation.areaName} tone="plain" />
                        <p className="text-sm font-semibold text-ink-900">{reservation.areaName}</p>
                        <StatusBadge status={reservation.status} />
                        {reservation.fineStatus ? (
                          <span
                            className={
                              reservation.fineStatus === "aberta"
                                ? "badge border-rose-200 bg-rose-50 text-rose-700"
                                : "badge border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          >
                            Multa {formatCurrencyBR(reservation.fineAmountCents ?? 5000)}{" "}
                            {reservation.fineStatus === "aberta" ? "em aberto" : "paga"}
                            {payment ? ` · ${PAYMENT_METHOD_LABEL[payment.method]}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-ink-500">
                        {formatDateBR(reservation.date)} ({weekdayBR(reservation.date)}) ·{" "}
                        {reservation.startTime}–{reservation.endTime} · {reservation.guests}{" "}
                        convidado(s)
                      </p>
                      {reservation.notes ? (
                        <p className="mt-1 text-[11px] italic text-ink-300">
                          “{reservation.notes}”
                        </p>
                      ) : null}
                      {reservation.keyDeliveredAt || reservation.keyReturnedAt ? (
                        <p className="mt-1 text-[10px] text-ink-300">
                          Chave entregue {formatDateTimeBR(reservation.keyDeliveredAt)}
                          {reservation.keyReturnedAt
                            ? ` · devolvida ${formatDateTimeBR(reservation.keyReturnedAt)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right text-[10px] leading-relaxed text-ink-300">
                      <p>Solicitada {formatDateTimeBR(reservation.createdAt)}</p>
                      {reservation.decidedAt ? (
                        <p>
                          {reservation.status === "recusada" ? "Recusada" : "Aprovada"}{" "}
                          {formatDateTimeBR(reservation.decidedAt)}
                        </p>
                      ) : null}
                      {reservation.cancelledAt ? (
                        <p>Cancelada {formatDateTimeBR(reservation.cancelledAt)}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Financeiro</p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
              Pagamentos
            </h2>
          </div>
          <span className="chip">{payments.length} comprovante(s)</span>
        </div>

        {payments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-cream-100/40 px-4 py-5 text-center text-xs text-ink-400">
            Nenhum pagamento registrado. Multas quitadas aparecem aqui com comprovante e forma de
            pagamento.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-800">
                    {formatCurrencyBR(payment.amountCents)} · {payment.areaName}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {formatDateBR(payment.reservationDate)} · {payment.methodLabel} ·{" "}
                    {formatDateTimeBR(payment.createdAt)}
                  </p>
                </div>
                <span className="rounded-lg border border-line bg-cream-50 px-2.5 py-1 font-mono text-[10px] text-ink-500">
                  {payment.receiptCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
