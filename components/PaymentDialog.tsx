"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrencyBR } from "@/lib/time";

type Method = "pix" | "cartao";

export function PaymentDialog({
  fineId,
  amountCents,
  areaName,
  reservationDate,
  label = "Pagar multa",
  className = "btn-gold btn-sm",
}: {
  fineId: number;
  amountCents: number;
  areaName?: string;
  reservationDate?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("pix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ code: string; method: string } | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fines/${fineId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir o pagamento.");
        return;
      }
      setReceipt({ code: data.payment?.receiptCode ?? "—", method });
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    if (receipt) router.refresh();
    setReceipt(null);
    setError(null);
    setMethod("pix");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-ink-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-line bg-cream-50 shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
              <div>
                <p className="eyebrow">Pagamento</p>
                <h2 className="mt-1 font-display text-2xl font-medium text-ink-900">
                  Quitar multa
                </h2>
                {areaName ? (
                  <p className="mt-1 text-xs text-ink-400">
                    {areaName}
                    {reservationDate ? ` · ${reservationDate}` : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition hover:bg-cream-200 hover:text-ink-700"
                aria-label="Fechar pagamento"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-2xl bg-ink-900 px-5 py-4 text-cream-100">
                <p className="text-[10px] uppercase tracking-[0.18em] text-cream-100/50">
                  Valor da multa
                </p>
                <p className="mt-1 font-display text-4xl text-cream-50">
                  {formatCurrencyBR(amountCents)}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-cream-100/50">
                  Cancelamento com menos de 24 horas de antecedência.
                </p>
              </div>

              {receipt ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg text-white">
                    ✓
                  </span>
                  <p className="mt-2 font-display text-xl text-emerald-900">
                    Pagamento confirmado
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    O apartamento já pode fazer novas reservas.
                  </p>
                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-ink-500">
                    Comprovante <strong className="text-ink-800">{receipt.code}</strong>
                    {" · "}
                    {receipt.method === "pix" ? "PIX" : "Cartão de crédito"}
                  </p>
                  <button type="button" onClick={close} className="btn-primary mt-4 w-full">
                    Concluir
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: "pix", title: "PIX", subtitle: "Aprovação imediata", icon: "⚡" },
                        { key: "cartao", title: "Cartão de crédito", subtitle: "Simulado", icon: "▣" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setMethod(option.key)}
                        className={`rounded-2xl border px-3.5 py-3 text-left transition ${
                          method === option.key
                            ? "border-ink-900 bg-ink-900 text-cream-50"
                            : "border-line bg-cream-50 text-ink-700 hover:border-gold-300"
                        }`}
                      >
                        <span className="text-base">{option.icon}</span>
                        <span className="mt-1 block text-xs font-semibold">{option.title}</span>
                        <span
                          className={`block text-[10px] ${
                            method === option.key ? "text-cream-100/60" : "text-ink-400"
                          }`}
                        >
                          {option.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-4 rounded-xl bg-cream-100/80 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
                    Ambiente de demonstração: o pagamento é simulado e gera um comprovante, sem
                    cobrança real. Em produção, seria integrado a um gateway (PIX/PSP).
                  </p>

                  {error ? (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={close} className="btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={pay}
                      disabled={loading}
                      className="btn-gold flex-1"
                    >
                      {loading ? "Processando…" : `Pagar ${formatCurrencyBR(amountCents)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
