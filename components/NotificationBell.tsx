"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { NotificationView } from "@/lib/notifications";
import { formatDateTimeBR } from "@/lib/time";

const TYPE_STYLE: Record<string, { dot: string; soft: string }> = {
  reserva: { dot: "bg-ink-500", soft: "bg-ink-50 text-ink-700" },
  aprovacao: { dot: "bg-gold-500", soft: "bg-gold-50 text-gold-800" },
  multa: { dot: "bg-rose-500", soft: "bg-rose-50 text-rose-700" },
  chave: { dot: "bg-[#146fae]", soft: "bg-[#e2eef8] text-[#1c5f95]" },
  manutencao: { dot: "bg-gold-500", soft: "bg-gold-50 text-gold-800" },
};

function BellIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-2 8-2 8h16s-2-1-2-8" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationBell({
  initialNotifications,
  initialUnread,
  variant = "sidebar",
}: {
  initialNotifications: NotificationView[];
  initialUnread: number;
  variant?: "sidebar" | "top";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch {
      // mantém os dados iniciais
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function markAll() {
    await fetch("/api/notifications/read", { method: "POST" }).catch(() => null);
    setUnread(0);
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
  }

  async function openNotification(item: NotificationView) {
    if (!item.readAt) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => null);
      setUnread((value) => Math.max(0, value - 1));
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-sm text-cream-100/75 transition hover:bg-white/[0.07] hover:text-cream-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-cream-200">
            <BellIcon />
          </span>
          <span className="flex-1">
            <span className="block text-[13px] font-medium">Notificações</span>
            <span className="block text-[10px] text-cream-100/40">
              {unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
            </span>
          </span>
          {unread > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold-300 px-1.5 text-[10px] font-bold text-ink-950">
              {unread}
            </span>
          ) : null}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-50 text-ink-600"
          aria-label="Notificações"
        >
          <BellIcon className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-ink-950/30 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Notificações"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-fit max-h-[85vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[24px] border border-line bg-cream-50 shadow-lift"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
              <div>
                <p className="eyebrow">Sua central</p>
                <h2 className="mt-0.5 font-display text-xl font-medium text-ink-900">
                  Notificações
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={markAll}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-ink-500 transition hover:bg-cream-200 hover:text-ink-800"
                  >
                    Marcar lidas
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                  aria-label="Fechar notificações"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-400">Carregando…</p>
              ) : items.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-200 text-ink-400">
                    <BellIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-display text-lg text-ink-800">Tudo tranquilo</p>
                  <p className="mt-1 text-sm text-ink-400">
                    Avisos de reservas, aprovações, multas e chaves aparecem aqui.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {items.map((item) => {
                    const style = TYPE_STYLE[item.type] ?? {
                      dot: "bg-ink-400",
                      soft: "bg-cream-200 text-ink-600",
                    };
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(item)}
                          className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-cream-100/70 ${
                            item.readAt ? "" : "bg-gold-50/40"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.soft}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-[13px] font-semibold text-ink-800">
                                {item.title}
                              </span>
                              {!item.readAt ? (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                              {item.message}
                            </span>
                            <span className="mt-1 block text-[10px] text-ink-300">
                              {formatDateTimeBR(item.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
