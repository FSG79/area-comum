"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelButton({ reservationId }: { reservationId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    const confirmed = window.confirm(
      "Cancelar esta reserva?\n\nAtenção: cancelamentos com menos de 24 horas de antecedência geram uma multa de R$ 50,00.",
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error ?? "Não foi possível cancelar a reserva.");
        return;
      }
      if (data.fineCreated) {
        window.alert(
          "Reserva cancelada. Foi gerada uma multa de R$ 50,00 porque o cancelamento ocorreu com menos de 24 horas de antecedência.",
        );
      }
      router.refresh();
    } catch {
      window.alert("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={cancel} disabled={loading} className="btn-danger btn-sm">
      {loading ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
