import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaIcon, getAreaVisual } from "@/components/AreaIcon";
import { BookingDialog } from "@/components/BookingDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { getArea } from "@/lib/areas";
import { requireUser } from "@/lib/auth";
import { listBlocksForDate } from "@/lib/blocks";
import { getAreaStrip } from "@/lib/calendar";
import { listDay } from "@/lib/reservations";
import { addDays, formatDateBR, isValidDate, todayISO } from "@/lib/time";

export const metadata: Metadata = { title: "Agenda da área · São Cristóvão" };

function longDate(date: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH_SHORT = [
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

export default async function AreaAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser(["morador", "sindico"]);
  const { areaId } = await params;
  const area = getArea(Number(areaId));
  if (!area) notFound();

  const query = await searchParams;
  const date = query.date && isValidDate(query.date) ? query.date : todayISO();
  const strip = getAreaStrip(user, area.id, date, 21);
  const bookings = listDay(user, date, area.id);
  const block = listBlocksForDate(date).find((item) => item.areaId === area.id);
  const nextAllowed = addDays(todayISO(), area.minAdvanceDays);
  const visual = getAreaVisual(area.name);

  return (
    <div className="space-y-5">
      <Link
        href="/agenda"
        className="inline-flex items-center gap-2 text-[11px] font-semibold text-ink-500 transition hover:text-ink-900"
      >
        ← Voltar para todas as áreas
      </Link>

      <section className="card relative overflow-hidden p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(420px 220px at 100% 0%, rgba(224,173,67,.12), transparent 65%)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex max-w-2xl items-start gap-4">
            <span
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl ${visual.soft} ${visual.text}`}
            >
              {visual.icon}
            </span>
            <div>
              <p className="eyebrow">Agenda da área</p>
              <h1 className="mt-1 font-display text-[2.6rem] font-medium leading-none tracking-tight text-ink-900">
                {area.name}
              </h1>
              <p className="mt-2 text-sm text-ink-500">{area.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip">Até {area.guestLimit} convidados</span>
                {area.requiresApproval ? (
                  <span className="chip-gold">Aprovação do síndico</span>
                ) : (
                  <span className="chip">Confirmação imediata</span>
                )}
                {area.minAdvanceDays > 0 ? (
                  <span className="chip">{area.minAdvanceDays} dias de antecedência</span>
                ) : (
                  <span className="chip">Reserva para o mesmo dia</span>
                )}
                <span className="chip">
                  {area.openTime}–{area.closeTime}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[240px] rounded-2xl border border-gold-200 bg-gold-50/70 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-700">
              ✦ Próxima data permitida
            </p>
            <p className="mt-1 font-display text-2xl text-ink-900">{formatDateBR(nextAllowed)}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
              {area.requiresApproval
                ? `A área exige ${area.minAdvanceDays} dias de antecedência e aprovação do síndico.`
                : "Reservas para o mesmo dia, se houver horário livre."}
            </p>
            <p className="mt-2 text-[10px] text-ink-400">
              A agenda abaixo mostra 21 dias a partir de {formatDateBR(date)}.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <section className="card min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda da área</p>
              <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
                Escolha um dia
              </h2>
            </div>
            {user.role === "morador" ? (
              <BookingDialog
                area={area}
                date={date}
                dateLabel={longDate(date)}
                blocked={Boolean(block)}
              />
            ) : null}
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {strip.map((day) => {
              const parsed = new Date(`${day.date}T12:00:00Z`);
              const isSelected = day.date === date;
              return (
                <Link
                  key={day.date}
                  href={`/agenda/${area.id}?date=${day.date}`}
                  className={[
                    "flex w-[58px] shrink-0 flex-col items-center rounded-xl border py-2.5 text-center transition",
                    isSelected
                      ? "border-ink-900 bg-ink-900 text-cream-50 shadow-soft"
                      : "border-line/70 bg-cream-50 text-ink-600 hover:border-gold-300 hover:bg-gold-50/50",
                  ].join(" ")}
                >
                  <span className="text-[8px] font-semibold uppercase tracking-[0.12em] opacity-60">
                    {WEEKDAY_SHORT[parsed.getUTCDay()]}
                  </span>
                  <span className="mt-1 font-display text-xl leading-none">
                    {day.date.slice(8, 10)}
                  </span>
                  <span className="mt-1 text-[8px] uppercase tracking-[0.1em] opacity-50">
                    {MONTH_SHORT[Number(day.date.slice(5, 7)) - 1]}
                  </span>
                  <span className="mt-1 flex h-1 items-center gap-0.5">
                    {day.blocked ? (
                      <span
                        className={`h-0.5 w-4 rounded-full ${
                          isSelected ? "bg-gold-200" : "bg-gold-500"
                        }`}
                      />
                    ) : day.total > 0 ? (
                      <span
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-cream-100" : "bg-ink-400"
                        }`}
                      />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 border-t border-line/70 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Dia selecionado</p>
                <h3 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
                  {longDate(date)}
                </h3>
              </div>
              <span className="chip">
                {bookings.length === 0 ? "Nenhuma reserva" : `${bookings.length} reserva(s)`}
              </span>
            </div>

            {block ? (
              <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-900">
                <strong className="font-semibold">Data bloqueada para manutenção.</strong>{" "}
                {block.reason || "Área indisponível"}.
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream-100/40 px-5 py-10 text-center">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${visual.soft} ${visual.text}`}
                  >
                    {visual.icon}
                  </span>
                  <p className="mt-3 font-display text-lg text-ink-800">Dia livre na agenda</p>
                  <p className="mt-1 max-w-sm text-xs text-ink-400">
                    Aproveite para garantir seu horário. As regras de antecedência e aprovação são
                    verificadas no servidor.
                  </p>
                </div>
              ) : (
                bookings.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-line/70 bg-cream-50 px-4 py-3"
                  >
                    <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-900 text-cream-50">
                      <span className="font-display text-base leading-none">
                        {reservation.startTime}
                      </span>
                      <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-cream-100/50">
                        até {reservation.endTime}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-800">
                        Apto {reservation.apartmentLabel}
                        {user.role === "sindico" ? ` · ${reservation.residentName}` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {reservation.guests} convidados
                        {reservation.notes ? ` · “${reservation.notes}”` : ""}
                      </p>
                    </div>
                    <StatusBadge status={reservation.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="min-w-0 space-y-4">
          <section className="card-dark p-5">
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest2 text-gold-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gold-300/30 bg-gold-300/10">
                ✓
              </span>
              Regras da área
            </p>
            <ul className="mt-4 space-y-3 text-[12px] leading-relaxed text-cream-100/70">
              <li className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-300" />
                Até {area.guestLimit} convidados por reserva.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-300" />
                {area.requiresApproval
                  ? "A reserva passa pela aprovação do síndico antes de confirmar."
                  : "Confirmação imediata, sem aprovação."}
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-300" />
                {area.minAdvanceDays > 0
                  ? `Reserve com pelo menos ${area.minAdvanceDays} dias de antecedência.`
                  : "Reserve para o mesmo dia, se houver horário livre."}
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-300" />
                Cancelamento com menos de 24 horas gera multa de{" "}
                <strong className="font-semibold text-cream-50">R$ 50,00</strong>.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-300" />
                Cada apartamento pode manter 2 reservas futuras.
              </li>
            </ul>
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-[10px] text-cream-100/40">
                <span>Reservas futuras do apto.</span>
                <span className="font-semibold text-cream-50">
                  {user.role === "morador" ? "máx. 2" : "visão do síndico"}
                </span>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-400">
              ⓘ Como funciona
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Escolha data, horário e número de convidados. O sistema verifica conflitos, o limite de
              convidados, a antecedência e as reservas futuras antes de confirmar.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              {area.requiresApproval
                ? "A reserva fica pendente até a análise do síndico. A agenda é atualizada na hora."
                : "A reserva entra direto na agenda, sem aprovação."}
            </p>
            <Link
              href="/agenda"
              className="mt-4 inline-flex text-[11px] font-semibold text-ink-700 underline decoration-gold-400 decoration-2 underline-offset-4"
            >
              Ver todas as áreas →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
