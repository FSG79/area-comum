"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalActions({ reservationId }: { reservationId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprovar" | "recusar" | null>(null);

  async function decide(decision: "aprovar" | "recusar") {
    if (decision === "recusar" && !window.confirm("Recusar esta solicitação de reserva?")) {
      return;
    }
    setLoading(decision);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error ?? "Não foi possível concluir a análise.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => decide("aprovar")}
        disabled={loading !== null}
        className="btn-primary btn-sm"
      >
        {loading === "aprovar" ? "Aprovando…" : "Aprovar"}
      </button>
      <button
        type="button"
        onClick={() => decide("recusar")}
        disabled={loading !== null}
        className="btn-danger btn-sm"
      >
        {loading === "recusar" ? "Recusando…" : "Recusar"}
      </button>
    </div>
  );
}
