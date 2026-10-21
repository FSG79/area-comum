"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function KeyControls({
  reservationId,
  delivered,
  returned,
}: {
  reservationId: number;
  delivered: boolean;
  returned: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"entrega" | "devolucao" | null>(null);

  async function register(action: "entrega" | "devolucao") {
    setLoading(action);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error ?? "Não foi possível registrar a chave.");
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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => register("entrega")}
        disabled={delivered || loading !== null}
        className="btn-secondary btn-sm"
      >
        {delivered ? "Chave entregue ✓" : loading === "entrega" ? "Registrando…" : "Entregar chave"}
      </button>
      <button
        type="button"
        onClick={() => register("devolucao")}
        disabled={returned || !delivered || loading !== null}
        className="btn-gold btn-sm"
      >
        {returned
          ? "Chave devolvida ✓"
          : loading === "devolucao"
            ? "Registrando…"
            : "Devolver chave"}
      </button>
    </div>
  );
}
