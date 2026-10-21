import type { Metadata } from "next";
import Link from "next/link";
import { ApprovalActions } from "@/components/ApprovalActions";
import { AreaManager } from "@/components/AreaManager";
import { BlockManager } from "@/components/BlockManager";
import { FinePayButton } from "@/components/FinePayButton";
import { StatusBadge } from "@/components/StatusBadge";
import { listAreas } from "@/lib/areas";
import { requireUser } from "@/lib/auth";
import { listUpcomingBlocks } from "@/lib/blocks";
import { listOpenFines } from "@/lib/fines";
import { listPendingForSindico } from "@/lib/reservations";
import { monthlyUsage } from "@/lib/usage";
import {
  currentMonth,
  formatCurrencyBR,
  formatDateBR,
  formatDateTimeBR,
  monthBounds,
  addDays,
  shiftMonth,
  todayISO,
  weekdayBR,
} from "@/lib/time";

export const metadata: Metadata = { title: "Painel do síndico · Área Comum" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser(["sindico"]);
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();

  const areas = listAreas();
  const pending = listPendingForSindico(user);
  const blocks = listUpcomingBlocks(user);
  const fines = listOpenFines(user);
  const usage = monthlyUsage(user, month);
  const bounds = monthBounds(month);

  const openFineTotal = fines.reduce((total, fine) => total + fine.amountCents, 0);
  const monthReservations = usage.reduce((total, row) => total + row.confirmed + row.pending, 0);
  const confirmedMonth = usage.reduce((total, row) => total + row.confirmed, 0);
  const monthLabel = bounds.label;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Painel do síndico</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Gestão do condomínio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Aprove solicitações, cadastre áreas e regras, bloqueie datas para manutenção e acompanhe
            o uso de cada espaço no mês.
          </p>
        </div>
        <Link href="/agenda" className="btn-secondary">
          Ver agenda completa
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card px-4 py-4">
          <p className="stat-value text-amber-600">{pending.length}</p>
          <p className="stat-label">Solicitações pendentes</p>
        </div>
        <div className="card px-4 py-4">
          <p className={`stat-value ${fines.length > 0 ? "text-rose-600" : ""}`}>
            {formatCurrencyBR(openFineTotal)}
          </p>
          <p className="stat-label">{fines.length} multa(s) em aberto</p>
        </div>
        <div className="card px-4 py-4">
          <p className="stat-value">{confirmedMonth}</p>
          <p className="stat-label">Reservas confirmadas em {monthLabel.toLowerCase()}</p>
        </div>
        <div className="card px-4 py-4">
          <p className="stat-value">{areas.length}</p>
          <p className="stat-label">Áreas cadastradas</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2">
        {[
          { href: "#aprovacoes", label: `Aprovações${pending.length ? ` (${pending.length})` : ""}` },
          { href: "#areas", label: "Áreas e regras" },
          { href: "#bloqueios", label: "Manutenção" },
          { href: "#multas", label: `Multas${fines.length ? ` (${fines.length})` : ""}` },
          { href: "#uso", label: "Uso do mês" },
        ].map((item) => (
          <a key={item.href} href={item.href} className="btn-secondary btn-sm">
            {item.label}
          </a>
        ))}
      </nav>

      <section id="aprovacoes" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Aprovações pendentes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Salão de festas e churrasqueira precisam da sua análise antes de confirmar.
            </p>
          </div>
          <span className="badge-pendente">{pending.length} pendente(s)</span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Nenhuma solicitação aguardando aprovação. Tudo em dia.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {pending.map((reservation) => (
              <li key={reservation.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{reservation.areaName}</h3>
                    <StatusBadge status={reservation.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateBR(reservation.date)} ({weekdayBR(reservation.date)}) ·{" "}
                    {reservation.startTime}–{reservation.endTime} · {reservation.guests}{" "}
                    convidado(s)
                  </p>
                  <p className="text-xs text-slate-500">
                    Apto {reservation.apartmentLabel} · {reservation.residentName}
                  </p>
                  {reservation.notes ? (
                    <p className="mt-1 text-xs italic text-slate-400">“{reservation.notes}”</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Solicitada em {formatDateTimeBR(reservation.createdAt)}
                  </p>
                </div>
                <ApprovalActions reservationId={reservation.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="areas" className="card scroll-mt-24 p-5">
        <AreaManager areas={areas} />
      </section>

      <section id="bloqueios" className="card scroll-mt-24 p-5">
        <BlockManager
          areas={areas}
          blocks={blocks}
          defaultDate={addDays(todayISO(), 1)}
        />
      </section>

      <section id="multas" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Multas em aberto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cancelamentos com menos de 24 horas geram multa de R$ 50,00. Ao quitar, o apartamento
              volta a poder reservar.
            </p>
          </div>
          <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            Total {formatCurrencyBR(openFineTotal)}
          </span>
        </div>

        {fines.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Nenhuma multa em aberto.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {fines.map((fine) => (
              <li key={fine.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Apto {fine.apartmentLabel} · {fine.areaName} em{" "}
                    {formatDateBR(fine.reservationDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fine.reason} · {formatCurrencyBR(fine.amountCents)} · registrada em{" "}
                    {formatDateTimeBR(fine.createdAt)}
                  </p>
                </div>
                <FinePayButton fineId={fine.id} amountCents={fine.amountCents} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="uso" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Uso das áreas no mês</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reservas confirmadas e pendentes em {monthLabel.toLowerCase()}.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={`/admin?month=${shiftMonth(month, -1)}#uso`} className="btn-secondary btn-sm">
              ← Mês anterior
            </Link>
            <span className="rounded-lg bg-sand px-3 py-1.5 text-xs font-bold capitalize text-slate-700">
              {monthLabel}
            </span>
            <Link href={`/admin?month=${shiftMonth(month, 1)}#uso`} className="btn-secondary btn-sm">
              Próximo mês →
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2.5">Área</th>
                <th className="px-3 py-2.5">Confirmadas</th>
                <th className="px-3 py-2.5">Pendentes</th>
                <th className="px-3 py-2.5">Horas reservadas</th>
                <th className="px-3 py-2.5">Convidados</th>
                <th className="px-3 py-2.5">Ocupação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usage.map((row) => (
                <tr key={row.areaId}>
                  <td className="px-3 py-3 font-semibold text-slate-800">{row.areaName}</td>
                  <td className="px-3 py-3 text-slate-600">{row.confirmed}</td>
                  <td className="px-3 py-3 text-slate-600">{row.pending}</td>
                  <td className="px-3 py-3 text-slate-600">{row.hours} h</td>
                  <td className="px-3 py-3 text-slate-600">{row.guests}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(row.occupancyPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{row.occupancyPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Ocupação calculada sobre a capacidade total do mês (horário de funcionamento × dias).
        </p>
      </section>
    </div>
  );
}
