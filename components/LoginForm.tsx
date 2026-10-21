"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_ACCOUNTS = [
  { label: "Síndico", name: "Sônia Ribeiro", email: "sindico@areacomum.app", password: "Sindico@123" },
  { label: "Portaria", name: "Paulo Andrade", email: "portaria@areacomum.app", password: "Portaria@123" },
  { label: "Morador A-101", name: "Ana Souza", email: "ana@areacomum.app", password: "Ana@1234" },
  { label: "Morador A-303", name: "Carla Mendes", email: "carla@areacomum.app", password: "Carla@1234" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function fill(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  return (
    <div>
      <p className="eyebrow">Bem-vindo de volta</p>
      <h1 className="mt-3 font-display text-[2.6rem] font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
        Entre na sua
        <br />
        <em className="text-gold-600">área comum.</em>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-500">
        Use o e-mail e a senha da sua conta para acessar a agenda do condomínio.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <div className="relative">
            <span className="field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input pl-10"
              placeholder="voce@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              Senha
            </label>
            <span className="text-[10px] text-ink-300">Acesso de demonstração</span>
          </div>
          <div className="relative">
            <span className="field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input pl-10"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-gold w-full py-3 text-[13px]" disabled={loading}>
          {loading ? "Entrando…" : "Entrar na plataforma"}
          <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-500">
        Ainda não tem acesso?{" "}
        <Link href="/cadastro" className="font-semibold text-ink-900 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-gold-700">
          Cadastre seu apartamento
        </Link>
      </p>

      <div className="mt-9 border-t border-line/80 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">
            Acesso rápido · demonstração
          </p>
          <span className="text-[9px] text-ink-300">clique para preencher</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fill(account)}
              className="rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-left transition hover:border-gold-300 hover:bg-gold-50/50"
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-700">
                {account.label}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-ink-400">{account.name}</span>
              <span className="mt-1 block truncate text-[9px] text-ink-300">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-300">
          Outras contas de morador: bruno@areacomum.app, carla@areacomum.app e
          diego@areacomum.app (senhas no README).
        </p>
      </div>
    </div>
  );
}
