import type { Metadata } from "next";
import Link from "next/link";
import { AreaIcon, getAreaVisual } from "@/components/AreaIcon";
import { MonthCalendar } from "@/components/MonthCalendar";
import { PaymentDialog } from "@/components/PaymentDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { listAreas } from "@/lib/areas";
import { requireUser } from "@/lib/auth";
import { getMonthCalendar } from "@/lib/calendar";
import { listOpenFinesForApartment } from "@/lib/fines";
import { listUpcomingForApartment } from "@/lib/reservations";
import {
  currentMonth,
  formatCurrencyBR,
  formatDateBR,
  nowParts,
  todayISO,
} from "@/lib/time";

export const metadata: Metadata = { title: "Visão geral · São Cristóvão" };

function longDate(date: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthShort(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

function greeting(): string {
  const { minutes } = nowParts();
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

export default async function HomePage() {
  const user = await requireUser(["morador"]);
  const today = todayISO();
  const areas = listAreas();
  const upcoming = listUpcomingForApartment(user);
  const openFines = listOpenFinesForApartment(user);
  const openFineTotal = openFines.reduce((total, fine) => total + fine.amountCents, 0);
  const calendar = getMonthCalendar(user, currentMonth());

  const nextReservation = upcoming[0] ?? null;
  const firstName = user.name.split(" ")[0];
  const nextByArea = new Map<number, (typeof upcoming)[number]>();
  for (const reservation of upcoming) {
    if (!nextByArea.has(reservation.areaId)) nextByArea.set(reservation.areaId, reservation);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest2 text-gold-700">
            {longDate(today)}
          </p>
          <h1 className="mt-2 font-display text-[2.7rem] font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-500">
            Que tal reunir a família ou os amigos? Encontre um espaço livre nas áreas comuns do
            condomínio.
          </p>
        </div>
        <Link href="/agenda" className="btn-gold">
          <span className="text-base leading-none">+</span> Reservar uma área
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card-dark relative min-w-0 overflow-hidden p-7 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(520px 300px at 95% 0%, rgba(224,173,67,.22), transparent 62%), radial-gradient(420px 260px at 5% 100%, rgba(109,148,134,.22), transparent 60%)",
            }}
          />
          {/* Marca d'água do logo oficial */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/emblem-sc.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 w-[330px] select-none opacity-[0.13]"
          />
          <div className="relative max-w-md">
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest2 text-gold-300">
              <span className="h-px w-7 bg-gold-400/60" />
              Sua próxima ocasião
            </p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-cream-50 sm:text-[2.9rem]">
              {nextReservation ? (
                <>
                  Seu próximo encontro
                  <br />
                  já tem <em className="text-gold-300">data.</em>
                </>
              ) : (
                <>
                  Um espaço livre
                  <br />
                  espera por <em className="text-gold-300">você.</em>
                </>
              )}
            </h2>
            {nextReservation ? (
              <p className="mt-4 text-sm text-cream-100/65">
                {nextReservation.areaName} · {formatDateBR(nextReservation.date)} ·{" "}
                {nextReservation.startTime}–{nextReservation.endTime} ·{" "}
                {nextReservation.guests} convidados
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-cream-100/65">
                Salão de festas, churrasqueira, quadra ou sala de reuniões: veja a agenda e encontre
                o melhor horário para o seu encontro.
              </p>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/agenda" className="btn-gold">
                Explorar agenda <span aria-hidden>→</span>
              </Link>
              <Link
                href="/minhas"
                className="btn border border-cream-100/20 bg-transparent text-cream-100 hover:bg-white/10"
              >
                Minhas reservas
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-cream-100/40">
              <span>4 áreas comuns</span>
              <span>Regras no servidor</span>
              <span>Chaves na portaria</span>
            </div>
          </div>
        </section>

        <aside className="card flex min-w-0 flex-col p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">
                Seu apartamento
              </p>
              <p className="mt-2 font-display text-4xl font-medium tracking-tight text-ink-900">
                {user.apartmentLabel}
              </p>
              <p className="mt-1 text-xs text-ink-400">Apartamento vinculado</p>
            </div>
            <span className="chip-gold">Apto {user.apartmentLabel}</span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-ink-600">Reservas futuras</span>
              <span className="font-semibold text-ink-800">{upcoming.length} de 2</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full bg-gold-400 transition-all"
                style={{ width: `${Math.min(100, (upcoming.length / 2) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-ink-400">
              Cada apartamento mantém até duas reservas futuras.
            </p>
          </div>

          <Link
            href="/historico"
            className="mt-5 flex items-center justify-between rounded-xl border border-line/80 bg-cream-100/60 px-3.5 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-cream-100"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-ink-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5M12 7v5l3 2" />
                </svg>
              </span>
              Histórico do apto.
            </span>
            <span aria-hidden>›</span>
          </Link>

          {openFineTotal > 0 ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-rose-800">
                Multa em aberto · {formatCurrencyBR(openFineTotal)}
              </p>
              <div className="mt-2">
                <PaymentDialog
                  fineId={openFines[0].id}
                  amountCents={openFineTotal}
                  areaName={openFines[0].areaName}
                  reservationDate={formatDateBR(openFines[0].reservationDate)}
                  label="Pagar multa"
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sem multas em aberto. Tudo certo.
            </p>
          )}
        </aside>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card min-w-0 p-6">
          <MonthCalendar data={calendar} selectedDate={today} basePath="/agenda" showLegend />
        </section>

        <section className="card flex min-w-0 flex-col p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">No seu calendário</p>
              <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
                Próximas reservas
              </h2>
            </div>
            <Link
              href="/minhas"
              className="text-[11px] font-semibold text-ink-500 underline decoration-line underline-offset-4 hover:text-ink-900"
            >
              Ver todas
            </Link>
          </div>

          <div className="mt-4 flex-1 space-y-2.5">
            {upcoming.length === 0 ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream-100/40 px-5 text-center">
                <p className="font-display text-lg text-ink-700">Nenhuma reserva futura</p>
                <p className="mt-1 text-xs text-ink-400">
                  Escolha uma área e garanta seu horário.
                </p>
                <Link href="/agenda" className="btn-primary btn-sm mt-4">
                  Ver agenda
                </Link>
              </div>
            ) : (
              upcoming.slice(0, 3).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center gap-3 rounded-2xl border border-line/70 bg-cream-50 px-3.5 py-3"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-900 text-cream-50">
                    <span className="font-display text-lg leading-none">
                      {reservation.date.slice(8, 10)}
                    </span>
                    <span className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-cream-100/50">
                      {monthShort(reservation.date)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-800">
                        {reservation.areaName}
                      </p>
                      <StatusBadge status={reservation.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {formatDateBR(reservation.date)} · {reservation.startTime}–
                      {reservation.endTime} · {reservation.guests} convidados
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Espaços do condomínio</p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900 sm:text-3xl">
              Escolha onde se encontrar
            </h2>
          </div>
          <Link href="/agenda" className="text-[11px] font-semibold text-ink-500 underline decoration-line underline-offset-4 hover:text-ink-900">
            Ver agenda completa
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((area) => {
            const next = nextByArea.get(area.id);
            const visual = getAreaVisual(area.name);
            return (
              <Link
                key={area.id}
                href={`/agenda/${area.id}`}
                className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-gold-300"
              >
                <div className="flex items-start justify-between">
                  <AreaIcon name={area.name} />
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream-50 text-ink-300 transition group-hover:border-gold-300 group-hover:text-gold-700">
                    ↗
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink-900">
                  {area.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-400">
                  {area.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="chip">{area.guestLimit} convidados</span>
                  <span className={area.requiresApproval ? "chip-gold" : "chip"}>
                    {area.requiresApproval ? "Com aprovação" : "Confirmação na hora"}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-line/70 pt-3 text-[10px] text-ink-400">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: visual.dot }}
                  />
                  {next ? `Próxima reserva em ${formatDateBR(next.date)}` : "Agenda livre"}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
