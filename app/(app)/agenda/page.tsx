import type { Metadata } from "next";
import Link from "next/link";
import { AreaIcon } from "@/components/AreaIcon";
import { BookingDialog } from "@/components/BookingDialog";
import { MonthCalendar } from "@/components/MonthCalendar";
import { StatusBadge } from "@/components/StatusBadge";
import { listAreas } from "@/lib/areas";
import { requireUser } from "@/lib/auth";
import { listBlocksForDate } from "@/lib/blocks";
import { getMonthCalendar } from "@/lib/calendar";
import { listDay, listUpcomingForApartment, type ReservationView } from "@/lib/reservations";
import { formatDateBR, isValidDate, todayISO, weekdayBR } from "@/lib/time";

export const metadata: Metadata = { title: "Agenda · São Cristóvão" };

function longDate(date: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser(["morador", "sindico"]);
  const params = await searchParams;
  const date = params.date && isValidDate(params.date) ? params.date : todayISO();

  const areas = listAreas();
  const calendar = getMonthCalendar(user, date.slice(0, 7));
  const blocks = listBlocksForDate(date);
  const dayReservations = listDay(user, date);
  const upcoming = user.role === "morador" ? listUpcomingForApartment(user) : [];

  const blockByArea = new Map(blocks.map((block) => [block.areaId, block]));
  const reservationsByArea = new Map<number, ReservationView[]>();
  for (const reservation of dayReservations) {
    const list = reservationsByArea.get(reservation.areaId) ?? [];
    list.push(reservation);
    reservationsByArea.set(reservation.areaId, list);
  }
  const dateLabel = longDate(date);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1 className="mt-2 font-display text-[2.7rem] font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
            Escolha o seu
            <br />
            <em className="text-gold-600">próximo espaço.</em>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-500">
            Veja os horários reservados em cada área e escolha a data ideal. As regras e a
            disponibilidade são conferidas no servidor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.apartmentLabel ? <span className="chip">Apto {user.apartmentLabel}</span> : null}
          {user.role === "morador" ? (
            <span className="chip-gold">{upcoming.length} de 2 reservas futuras</span>
          ) : (
            <span className="chip">Visão completa do condomínio</span>
          )}
          <Link href={`/agenda?date=${todayISO()}`} className="btn-secondary btn-sm">
            Hoje
          </Link>
        </div>
      </header>

      <section className="card p-6 sm:p-7">
        <MonthCalendar data={calendar} selectedDate={date} basePath="/agenda" showLegend />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 font-display text-lg text-cream-50">
              {date.slice(8, 10)}
            </span>
            <div>
              <p className="font-display text-lg leading-tight text-ink-900">{dateLabel}</p>
              <p className="text-[11px] text-ink-400">
                {dayReservations.length === 0
                  ? "Nenhuma reserva ativa neste dia."
                  : `${dayReservations.length} reserva(s) ativa(s) neste dia.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-300">
            <span>{formatDateBR(date)}</span>
            <span className="h-1 w-1 rounded-full bg-ink-200" />
            <span className="capitalize">{weekdayBR(date)}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {areas.map((area) => {
          const reservations = reservationsByArea.get(area.id) ?? [];
          const block = blockByArea.get(area.id);
          return (
            <article key={area.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AreaIcon name={area.name} />
                  <div>
                    <h2 className="font-display text-[1.4rem] font-medium leading-tight tracking-tight text-ink-900">
                      {area.name}
                    </h2>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-400">
                      {area.description}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/agenda/${area.id}?date=${date}`}
                  className="shrink-0 rounded-full border border-line bg-cream-50 px-3 py-1.5 text-[10px] font-semibold text-ink-500 transition hover:border-gold-300 hover:text-gold-800"
                >
                  Ver agenda ↗
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip">Até {area.guestLimit} convidados</span>
                {area.requiresApproval ? (
                  <span className="chip-gold">
                    Aprovação do síndico · {area.minAdvanceDays} dias antes
                  </span>
                ) : (
                  <span className="chip">Confirmação na hora</span>
                )}
                <span className="chip">
                  {area.openTime}–{area.closeTime}
                </span>
              </div>

              {block ? (
                <div className="mt-3 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-[11px] text-gold-900">
                  <strong className="font-semibold">Manutenção neste dia:</strong>{" "}
                  {block.reason || "área indisponível"}.
                </div>
              ) : null}

              <div className="mt-4 flex-1 space-y-2">
                {reservations.length === 0 ? (
                  <div className="flex h-full min-h-[84px] flex-col items-center justify-center rounded-xl border border-dashed border-line/80 bg-cream-100/30 px-3 py-4 text-center">
                    <p className="text-[11px] font-medium text-ink-500">Dia livre na agenda</p>
                    <p className="mt-0.5 text-[10px] text-ink-300">
                      Aproveite para garantir seu horário.
                    </p>
                  </div>
                ) : (
                  reservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center gap-3 rounded-xl border border-line/70 bg-cream-50 px-3 py-2.5"
                    >
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-cream-200/80 font-display text-[13px] leading-none text-ink-800">
                        {reservation.startTime.slice(0, 5)}
                        <span className="mt-1 text-[8px] font-sans text-ink-400">
                          {reservation.endTime.slice(0, 5)}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-ink-800">
                          Apto {reservation.apartmentLabel}
                          {user.role === "sindico" ? ` · ${reservation.residentName}` : ""}
                        </p>
                        <p className="text-[10px] text-ink-400">
                          {reservation.guests} convidado(s)
                          {reservation.notes ? ` · “${reservation.notes}”` : ""}
                        </p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-4">
                <span className="text-[10px] uppercase tracking-[0.14em] text-ink-300">
                  {reservations.length} reserva(s) ativa(s)
                </span>
                {user.role === "morador" ? (
                  <BookingDialog
                    area={area}
                    date={date}
                    dateLabel={dateLabel}
                    blocked={Boolean(block)}
                  />
                ) : (
                  <span className="text-[10px] text-ink-300">Reservas feitas pelos moradores</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-[22px] bg-ink-900 px-6 py-5 text-[11px] leading-relaxed text-cream-100/65">
        <span className="font-bold uppercase tracking-[0.16em] text-gold-300">
          Regras do condomínio ·{" "}
        </span>
        no máximo 2 reservas futuras por apartamento · salão de festas e churrasqueira exigem 3 dias
        de antecedência e aprovação do síndico · quadra e sala de reuniões são confirmadas na hora ·
        cancelamento com menos de 24 horas gera multa de R$ 50,00 · apartamento com multa em aberto
        não pode fazer novas reservas.
      </div>
    </div>
  );
}