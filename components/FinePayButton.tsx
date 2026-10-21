"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrencyBR } from "@/lib/time";

export function FinePayButton({ fineId, amountCents }: { fineId: number; amountCents: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (
      !window.confirm(
        `Registrar a quitação manual da multa de ${formatCurrencyBR(amountCents)}? O apartamento voltará a poder reservar.`,
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/fines/${fineId}/pay`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error ?? "Não foi possível quitar a multa.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={pay} disabled={loading} className="btn-gold btn-sm">
      {loading ? "Quitando…" : "Registrar quitação"}
    </button>
  );
}
