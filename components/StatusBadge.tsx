import type { ReservationStatus } from "@/lib/db";

const ui: Record<ReservationStatus, { label: string; className: string }> = {
  confirmada: { label: "Confirmada", className: "badge-confirmada" },
  pendente: { label: "Pendente de aprovação", className: "badge-pendente" },
  recusada: { label: "Recusada", className: "badge-recusada" },
  cancelada: { label: "Cancelada", className: "badge-cancelada" },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const item = ui[status];
  return (
    <span className={item.className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  );
}

export function RoleLabel({ role }: { role: "morador" | "sindico" | "porteiro" }) {
  const labels = { morador: "Morador", sindico: "Síndico", porteiro: "Portaria" } as const;
  return <>{labels[role]}</>;
}
