"use client";

import { useRouter } from "next/navigation";

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d + days));
  return base.toISOString().slice(0, 10);
}

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function DatePicker({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter();

  function go(next: string) {
    router.push(`${basePath}?date=${next}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => go(addDays(date, -1))}
        className="btn-secondary px-3 py-2"
        aria-label="Dia anterior"
      >
        ←
      </button>
      <input
        type="date"
        value={date}
        onChange={(event) => event.target.value && go(event.target.value)}
        className="input w-auto"
        aria-label="Escolher data"
      />
      <button
        type="button"
        onClick={() => go(addDays(date, 1))}
        className="btn-secondary px-3 py-2"
        aria-label="Próximo dia"
      >
        →
      </button>
      <button type="button" onClick={() => go(todayLocal())} className="btn-ghost">
        Hoje
      </button>
    </div>
  );
}
