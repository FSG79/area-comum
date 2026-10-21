"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AreaView } from "@/lib/areas";
import type { BlockView } from "@/lib/blocks";
import { formatDateBR } from "@/lib/time";

export function BlockManager({
  areas,
  blocks,
  defaultDate,
}: {
  areas: AreaView[];
  blocks: BlockView[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [areaId, setAreaId] = useState(String(areas[0]?.id ?? ""));
  const [date, setDate] = useState(defaultDate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: Number(areaId), date, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível bloquear a data.");
        return;
      }
      setReason("");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remover este bloqueio de manutenção?")) return;
    const response = await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.alert(data.error ?? "Não foi possível remover o bloqueio.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h2 className="section-title">Bloqueios de manutenção</h2>
      <p className="mt-1 text-sm text-slate-500">
        Bloqueie um dia inteiro de uma área. As reservas daquele dia precisam ser canceladas antes.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl bg-sand p-4 ring-1 ring-brand-900/5 sm:grid-cols-[1.2fr_1fr_1.6fr_auto]">
        <div>
          <label className="label" htmlFor="block-area">
            Área
          </label>
          <select
            id="block-area"
            className="input"
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            required
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="block-date">
            Data
          </label>
          <input
            id="block-date"
            type="date"
            className="input"
            value={date}
            min={defaultDate}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="block-reason">
            Motivo
          </label>
          <input
            id="block-reason"
            className="input"
            maxLength={200}
            placeholder="Ex.: manutenção elétrica"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Bloqueando…" : "Bloquear"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {blocks.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Nenhum bloqueio futuro no momento.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
            {blocks.map((block) => (
              <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">
                    {block.areaName} · {formatDateBR(block.date)}
                  </p>
                  <p className="text-xs text-slate-500">{block.reason || "Sem motivo informado"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(block.id)}
                  className="btn-danger btn-sm"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
