"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/db";
import type { NotificationView } from "@/lib/notifications";
import { Brand } from "@/components/Brand";
import { NotificationBell } from "@/components/NotificationBell";

interface NavUser {
  name: string;
  role: Role;
  apartmentLabel: string | null;
}

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l9 9M17 17l2-2M14 14l2-2" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15 12H3M11 8l-4 4 4 4M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </svg>
  ),
};

const NAV: Record<Role, { href: string; label: string; subtitle: string; icon: string }[]> = {
  morador: [
    { href: "/inicio", label: "Visão geral", subtitle: "Seu apartamento em um olhar", icon: "home" },
    { href: "/agenda", label: "Agenda das áreas", subtitle: "Datas livres e reservas", icon: "calendar" },
    { href: "/minhas", label: "Minhas reservas", subtitle: "Solicitações e cancelamentos", icon: "list" },
    { href: "/historico", label: "Histórico", subtitle: "Reservas, multas e pagamentos", icon: "history" },
  ],
  sindico: [
    { href: "/admin", label: "Painel do síndico", subtitle: "Aprovações e regras", icon: "shield" },
    { href: "/agenda", label: "Agenda das áreas", subtitle: "Visão completa do condomínio", icon: "calendar" },
  ],
  porteiro: [
    { href: "/portaria", label: "Portaria do dia", subtitle: "Chaves e reservas de hoje", icon: "key" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  morador: "Morador",
  sindico: "Síndico",
  porteiro: "Portaria",
};

export function AppNav({
  user,
  notifications,
  unread,
}: {
  user: NavUser;
  notifications: NotificationView[];
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const items = NAV[user.role];

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-ink-900 px-3 py-6 text-cream-100 lg:flex">
        <div className="px-3">
          <Brand tone="dark" />
        </div>

        <div className="mt-9 flex items-center justify-between px-3">
          <span className="text-[8px] font-semibold uppercase tracking-[0.24em] text-cream-100/35">
            Menu do perfil
          </span>
          <span className="rounded-full border border-gold-300/30 bg-gold-300/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-gold-200">
            {ROLE_LABEL[user.role]}
          </span>
        </div>

        <nav className="mt-3 space-y-1">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "nav-item-active" : ""}`}
              >
                <span className="nav-icon">{ICONS[item.icon]}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[10px] leading-tight ${
                      active ? "text-ink-500" : "text-cream-100/35"
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 px-1">
          <NotificationBell
            variant="sidebar"
            initialNotifications={notifications}
            initialUnread={unread}
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-300 text-[11px] font-bold text-ink-950">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm text-cream-50">{user.name}</p>
                <p className="truncate text-[10px] text-cream-100/45">
                  {ROLE_LABEL[user.role]}
                  {user.apartmentLabel ? ` · Apto ${user.apartmentLabel}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={leaving}
                className="flex h-8 w-8 items-center justify-center rounded-full text-cream-100/50 transition hover:bg-white/10 hover:text-cream-50 disabled:opacity-50"
                aria-label="Sair"
                title="Sair"
              >
                {ICONS.logout}
              </button>
            </div>
          </div>

          <p className="px-2 pb-1 text-[9px] leading-relaxed text-cream-100/25">
            Condomínio Exemplo
            <br />
            Gestão de convivência · demonstração
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand tone="light" />
          <div className="flex items-center gap-2">
            <NotificationBell
              variant="top"
              initialNotifications={notifications}
              initialUnread={unread}
            />
            <button
              type="button"
              onClick={logout}
              disabled={leaving}
              className="rounded-full border border-line bg-cream-50 px-3 py-1.5 text-[11px] font-semibold text-ink-500"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "border-ink-900 bg-ink-900 text-cream-50"
                    : "border-line bg-cream-50 text-ink-500"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
