import Link from "next/link";
import { getAreaVisual } from "@/components/AreaIcon";
import type { MonthCalendarData } from "@/lib/calendar";
import { shiftMonth } from "@/lib/time";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function MonthCalendar({
  data,
  selectedDate,
  basePath = "/agenda",
  compact = false,
  showHeader = true,
  showLegend = false,
}: {
  data: MonthCalendarData;
  selectedDate: string;
  basePath?: string;
  compact?: boolean;
  showHeader?: boolean;
  showLegend?: boolean;
}) {
  const leading = (data.firstWeekday + 6) % 7;
  const cells: (number | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= data.daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthHref = (month: string) => `${basePath}?date=${month}-01`;

  return (
    <div>
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Calendário</p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink-900">
              {data.label}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={monthHref(shiftMonth(data.month, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-50 text-ink-500 transition hover:bg-white hover:text-ink-900"
              aria-label="Mês anterior"
            >
              ←
            </Link>
            <Link
              href={monthHref(shiftMonth(data.month, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-50 text-ink-500 transition hover:bg-white hover:text-ink-900"
              aria-label="Próximo mês"
            >
              →
            </Link>
          </div>
        </div>
      ) : null}

      <div className={`grid grid-cols-7 gap-1 ${showHeader ? "mt-5" : ""}`}>
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className={`pb-1 text-center font-semibold uppercase tracking-[0.12em] text-ink-300 ${
              compact ? "text-[8px]" : "text-[9px]"
            }`}
          >
            {weekday}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} />;
          const date = `${data.month}-${pad(day)}`;
          const info = data.days[date];
          const selected = date === selectedDate;
          const today = date === data.today;
          const hasBlock = Boolean(info?.blockedAreaIds.length);
          const dots = info
            ? [
                ...new Map(
                  info.areas.map((area) => [area.areaId, getAreaVisual(area.areaName).dot]),
                ).values(),
              ]
            : [];

          return (
            <Link
              key={date}
              href={`${basePath}?date=${date}`}
              title={`${day} — ${info?.total ?? 0} reserva(s)${hasBlock ? " · manutenção" : ""}`}
              className={[
                "relative flex flex-col items-center justify-center gap-1 rounded-xl border text-center transition",
                compact ? "h-9 text-[11px]" : "h-14 text-xs sm:h-16",
                selected
                  ? "border-ink-900 bg-ink-900 text-cream-50 shadow-soft"
                  : "border-line/70 bg-cream-50 text-ink-700 hover:border-gold-300 hover:bg-gold-50/50",
                today && !selected ? "border-gold-400" : "",
              ].join(" ")}
            >
              <span className={today ? "font-bold" : "font-medium"}>{day}</span>
              {!compact && dots.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  {dots.slice(0, 4).map((color, dotIndex) => (
                    <span
                      key={`${color}-${dotIndex}`}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: selected ? "#f2e9d9" : color }}
                    />
                  ))}
                </span>
              ) : null}
              {!compact && hasBlock ? (
                <span
                  className={`absolute bottom-1 h-0.5 w-4 rounded-full ${
                    selected ? "bg-gold-200" : "bg-gold-400"
                  }`}
                />
              ) : null}
            </Link>
          );
        })}
      </div>

      {showLegend ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-ink-400">
          {data.areas.map((area) => (
            <span key={area.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: getAreaVisual(area.name).dot }}
              />
              {area.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-gold-400" />
            manutenção
          </span>
        </div>
      ) : null}
    </div>
  );
}
