"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AreaView } from "@/lib/areas";

interface FormState {
  name: string;
  description: string;
  guestLimit: string;
  requiresApproval: boolean;
  minAdvanceDays: string;
  openTime: string;
  closeTime: string;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  guestLimit: "20",
  requiresApproval: false,
  minAdvanceDays: "0",
  openTime: "08:00",
  closeTime: "22:00",
};

function toForm(area: AreaView): FormState {
  return {
    name: area.name,
    description: area.description,
    guestLimit: String(area.guestLimit),
    requiresApproval: area.requiresApproval,
    minAdvanceDays: String(area.minAdvanceDays),
    openTime: area.openTime,
    closeTime: area.closeTime,
  };
}

export function AreaManager({ areas }: { areas: AreaView[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "create" | number>("none");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setMode("create");
    setForm(EMPTY);
    setError(null);
  }

  function openEdit(area: AreaView) {
    setMode(area.id);
    setForm(toForm(area));
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      guestLimit: Number(form.guestLimit),
      requiresApproval: form.requiresApproval,
      minAdvanceDays: Number(form.minAdvanceDays),
      openTime: form.openTime,
      closeTime: form.closeTime,
    };
    try {
      const response = await fetch(
        mode === "create" ? "/api/areas" : `/api/areas/${mode}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar a área.");
        return;
      }
      setMode("none");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Áreas e regras</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre espaços e ajuste limite de convidados, aprovação e antecedência.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary btn-sm">
          + Nova área
        </button>
      </div>

      {mode !== "none" ? (
        <form onSubmit={submit} className="mt-4 rounded-2xl bg-brand-50/70 p-4 ring-1 ring-brand-100">
          <p className="text-sm font-bold text-brand-900">
            {mode === "create" ? "Cadastrar nova área" : `Editar ${areas.find((a) => a.id === mode)?.name ?? "área"}`}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="area-name">
                Nome
              </label>
              <input
                id="area-name"
                className="input"
                required
                maxLength={60}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Ex.: Espaço gourmet"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="area-description">
                Descrição
              </label>
              <input
                id="area-description"
                className="input"
                maxLength={300}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="area-guests">
                Limite de convidados
              </label>
              <input
                id="area-guests"
                type="number"
                min={1}
                max={1000}
                required
                className="input"
                value={form.guestLimit}
                onChange={(event) => set("guestLimit", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="area-advance">
                Antecedência mínima (dias)
              </label>
              <input
                id="area-advance"
                type="number"
                min={0}
                max={30}
                required
                className="input"
                value={form.minAdvanceDays}
                onChange={(event) => set("minAdvanceDays", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="area-open">
                Abre às
              </label>
              <input
                id="area-open"
                type="time"
                required
                className="input"
                value={form.openTime}
                onChange={(event) => set("openTime", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="area-close">
                Fecha às
              </label>
              <input
                id="area-close"
                type="time"
                required
                className="input"
                value={form.closeTime}
                onChange={(event) => set("closeTime", event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.requiresApproval}
                onChange={(event) => set("requiresApproval", event.target.checked)}
              />
              Exige aprovação do síndico antes de confirmar
            </label>
          </div>

          {error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? "Salvando…" : "Salvar área"}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMode("none")}>
              Fechar
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-2.5">Área</th>
              <th className="px-3 py-2.5">Limite</th>
              <th className="px-3 py-2.5">Regra</th>
              <th className="px-3 py-2.5">Horário</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {areas.map((area) => (
              <tr key={area.id} className="align-top">
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-800">{area.name}</p>
                  <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-slate-500">
                    {area.description}
                  </p>
                </td>
                <td className="px-3 py-3 text-slate-600">{area.guestLimit} pessoas</td>
                <td className="px-3 py-3">
                  {area.requiresApproval ? (
                    <span className="badge-pendente">Aprovação · {area.minAdvanceDays}d</span>
                  ) : (
                    <span className="badge-confirmada">Confirma na hora</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                  {area.openTime}–{area.closeTime}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(area)}
                    className="btn-secondary btn-sm"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
