"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AreaView } from "@/lib/areas";

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function defaultWindow(area: AreaView): { start: string; end: string } {
  const open = minutes(area.openTime);
  const close = minutes(area.closeTime);
  const preferredStart = Math.max(open, Math.min(18 * 60, close - 120));
  return { start: fromMinutes(preferredStart), end: fromMinutes(preferredStart + 120) };
}

export function BookingDialog({
  area,
  date,
  dateLabel,
  blocked,
}: {
  area: AreaView;
  date: string;
  dateLabel: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const initial = useMemo(() => defaultWindow(area), [area]);
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);
  const [guests, setGuests] = useState(String(Math.min(10, area.guestLimit)));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openDialog() {
    setStartTime(initial.start);
    setEndTime(initial.end);
    setGuests(String(Math.min(10, area.guestLimit)));
    setNotes("");
    setError(null);
    setSuccess(null);
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: area.id,
          date,
          startTime,
          endTime,
          guests: Number(guests),
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível criar a reserva.");
        return;
      }
      setSuccess(
        data.reservation?.status === "pendente"
          ? "Solicitação enviada! O síndico precisa aprovar a reserva."
          : "Reserva confirmada na hora! Ela já aparece na agenda.",
      );
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1000);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={blocked}
        className={blocked ? "btn-secondary btn-sm cursor-not-allowed opacity-60" : "btn-gold btn-sm"}
      >
        {blocked ? "Manutenção" : "+ Nova reserva"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-line bg-cream-50 shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
              <div>
                <p className="eyebrow">Nova reserva</p>
                <h3 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
                  {area.name}
                </h3>
                <p className="text-xs text-ink-400">{dateLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition hover:bg-cream-200 hover:text-ink-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="px-6 py-5">
              <div className="rounded-xl border border-line/70 bg-cream-100/60 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
                {area.requiresApproval
                  ? `Esta área exige aprovação do síndico e pelo menos ${area.minAdvanceDays} dia(s) de antecedência. A reserva fica pendente até a análise.`
                  : "Esta área é confirmada na hora, se estiver livre."}{" "}
                Limite de {area.guestLimit} convidados · {area.openTime}–{area.closeTime}.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start" className="label">
                    Início
                  </label>
                  <input
                    id="start"
                    type="time"
                    className="input"
                    min={area.openTime}
                    max={area.closeTime}
                    step={1800}
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end" className="label">
                    Término
                  </label>
                  <input
                    id="end"
                    type="time"
                    className="input"
                    min={area.openTime}
                    max={area.closeTime}
                    step={1800}
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-3">
                <div>
                  <label htmlFor="guests" className="label">
                    Convidados
                  </label>
                  <input
                    id="guests"
                    type="number"
                    className="input"
                    min={1}
                    max={area.guestLimit}
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="label">
                    Observações
                  </label>
                  <input
                    id="notes"
                    className="input"
                    maxLength={200}
                    placeholder="Ex.: aniversário"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-ink-300">
                Máximo de {area.guestLimit} pessoas nesta área.
              </p>

              {error ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                  {success}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-gold" disabled={loading || Boolean(success)}>
                  {loading ? "Enviando…" : "Confirmar reserva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
