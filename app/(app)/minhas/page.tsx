import type { Metadata } from "next";
import Link from "next/link";
import { AreaIcon } from "@/components/AreaIcon";
import { CancelButton } from "@/components/CancelButton";
import { PaymentDialog } from "@/components/PaymentDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { listOpenFinesForApartment } from "@/lib/fines";
import { listUpcomingForApartment } from "@/lib/reservations";
import { formatCurrencyBR } from "@/lib/time";

export const metadata: Metadata = { title: "Minhas reservas · Condomínio Exemplo" };

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

function longDate(date: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function MyReservationsPage() {
  const user = await requireUser(["morador"]);
  const reservations = listUpcomingForApartment(user);
  const openFines = listOpenFinesForApartment(user);
  const openFineTotal = openFines.reduce((total, fine) => total + fine.amountCents, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Apto {user.apartmentLabel}</p>
          <h1 className="mt-2 font-display text-[2.7rem] font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
            Minhas
            <br />
            <em className="text-gold-600">reservas.</em>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink-500">
            Acompanhe as reservas futuras do apartamento e cancele quando precisar.
          </p>
        </div>
        <Link href="/agenda" className="btn-gold">
          <span className="text-base leading-none">+</span> Reservar uma área
        </Link>
      </header>

      {openFineTotal > 0 ? (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-rose-200/80 bg-rose-50/50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-lg text-rose-700">
              !
            </span>
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Multa em aberto de {formatCurrencyBR(openFineTotal)}
              </p>
              <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-rose-700">
                Enquanto houver multa em aberto, o apartamento não pode fazer novas reservas. Pague
                agora para liberar a agenda.
              </p>
            </div>
          </div>
          <PaymentDialog
            fineId={openFines[0].id}
            amountCents={openFineTotal}
            areaName={openFines[0].areaName}
            reservationDate={openFines[0].reservationDate.split("-").reverse().join("/")}
          />
        </section>
      ) : null}

      {reservations.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream-200 text-ink-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <p className="mt-4 font-display text-2xl text-ink-800">Nenhuma reserva futura</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
            Que tal reservar a quadra ou a sala de reuniões para o próximo fim de semana?
          </p>
          <Link href="/agenda" className="btn-gold mt-5">
            Ver agenda das áreas
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Reservas futuras</h2>
            <span className="chip">{reservations.length} de 2 reservas</span>
          </div>
          {reservations.map((reservation) => (
            <article key={reservation.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink-900 text-cream-50">
                    <span className="font-display text-2xl leading-none">
                      {reservation.date.slice(8, 10)}
                    </span>
                    <span className="mt-1 text-[8px] uppercase tracking-[0.16em] text-cream-100/50">
                      {MONTHS[Number(reservation.date.slice(5, 7)) - 1]}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AreaIcon name={reservation.areaName} tone="plain" />
                      <h3 className="font-display text-xl font-medium leading-tight text-ink-900">
                        {reservation.areaName}
                      </h3>
                      <StatusBadge status={reservation.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{longDate(reservation.date)}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {reservation.startTime}–{reservation.endTime} · {reservation.guests}{" "}
                      convidado(s)
                    </p>
                    {reservation.notes ? (
                      <p className="mt-1 text-[11px] italic text-ink-300">
                        “{reservation.notes}”
                      </p>
                    ) : null}
                    {reservation.status === "pendente" ? (
                      <p className="mt-2 inline-flex rounded-lg border border-gold-200 bg-gold-50 px-2.5 py-1.5 text-[10px] font-medium text-gold-800">
                        Aguardando aprovação do síndico.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <CancelButton reservationId={reservation.id} />
                  <span className="max-w-[180px] text-right text-[9px] leading-relaxed text-ink-300">
                    {reservation.status === "confirmada"
                      ? "Cancelamento com menos de 24h gera multa de R$ 50,00"
                      : "Solicitação ainda não confirmada"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-ink-300">
        Cada apartamento pode manter no máximo duas reservas futuras ativas. Reservas de salão de
        festas e churrasqueira ficam pendentes até a aprovação do síndico.
      </p>
    </div>
  );
}
