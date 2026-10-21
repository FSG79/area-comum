import type { Metadata } from "next";
import { KeyControls } from "@/components/KeyControls";
import { requireUser } from "@/lib/auth";
import { listTodayForPorteiro } from "@/lib/reservations";
import { formatDateBR, formatDateTimeBR, todayISO, weekdayBR } from "@/lib/time";

export const metadata: Metadata = { title: "Portaria · Área Comum" };

export default async function ConciergePage() {
  const user = await requireUser(["porteiro"]);
  const reservations = listTodayForPorteiro(user);
  const today = todayISO();

  const delivered = reservations.filter((reservation) => reservation.keyDeliveredAt).length;
  const returned = reservations.filter((reservation) => reservation.keyReturnedAt).length;
  const pendingKeys = reservations.length - delivered;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Portaria · {user.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Reservas de hoje
          </h1>
          <p className="mt-1 capitalize text-sm text-slate-500">
            {weekdayBR(today)} · {formatDateBR(today)}
          </p>
        </div>
        <span className="badge-info">Acesso somente às reservas do dia</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-4">
          <p className="stat-value">{reservations.length}</p>
          <p className="stat-label">Reservas confirmadas hoje</p>
        </div>
        <div className="card px-4 py-4">
          <p className="stat-value text-emerald-600">{delivered}</p>
          <p className="stat-label">Chaves entregues</p>
        </div>
        <div className="card px-4 py-4">
          <p className="stat-value text-brand-700">{pendingKeys}</p>
          <p className="stat-label">Chaves a entregar</p>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-lg font-bold text-slate-800">Nenhuma reserva para hoje</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Quando houver reservas confirmadas para o dia, elas aparecem aqui com nome,
            apartamento e número de convidados.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-900 text-white">
                    <span className="text-base font-extrabold leading-none">
                      {reservation.startTime}
                    </span>
                    <span className="mt-1 text-[10px] text-brand-200">
                      até {reservation.endTime}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{reservation.areaName}</h2>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Apto {reservation.apartmentLabel} · {reservation.residentName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {reservation.guests} convidados
                      {reservation.notes ? ` · “${reservation.notes}”` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <span
                      className={
                        reservation.keyDeliveredAt
                          ? "badge-confirmada"
                          : "badge bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                      }
                    >
                      {reservation.keyDeliveredAt
                        ? `Entregue ${formatDateTimeBR(reservation.keyDeliveredAt)}`
                        : "Chave não entregue"}
                    </span>
                    <span
                      className={
                        reservation.keyReturnedAt
                          ? "badge-confirmada"
                          : "badge bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                      }
                    >
                      {reservation.keyReturnedAt
                        ? `Devolvida ${formatDateTimeBR(reservation.keyReturnedAt)}`
                        : "Chave não devolvida"}
                    </span>
                  </div>
                  <KeyControls
                    reservationId={reservation.id}
                    delivered={Boolean(reservation.keyDeliveredAt)}
                    returned={Boolean(reservation.keyReturnedAt)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-slate-400">
        A portaria vê apenas as reservas do dia, com nome do morador, apartamento e número de
        convidados. O acesso a outros dias e às demais informações é bloqueado no servidor.
      </p>
    </div>
  );
}
