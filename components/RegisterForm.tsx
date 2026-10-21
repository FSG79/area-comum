"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    block: "",
    number: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir o cadastro.");
        return;
      }
      router.push(data.redirect ?? "/agenda");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-7 sm:p-8">
      <p className="eyebrow">Cadastro de morador</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Criar conta</h2>
      <p className="mt-1 text-sm text-slate-500">
        Informe seus dados e o apartamento. O síndico e a portaria usam as contas fixas do sistema.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="label">
            Nome completo
          </label>
          <input
            id="name"
            className="input"
            required
            placeholder="Seu nome"
            value={form.name}
            onChange={update("name")}
          />
        </div>
        <div>
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="input"
            required
            placeholder="voce@exemplo.com"
            value={form.email}
            onChange={update("email")}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="input"
            required
            minLength={8}
            placeholder="Mínimo de 8 caracteres"
            value={form.password}
            onChange={update("password")}
          />
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <div>
            <label htmlFor="block" className="label">
              Bloco
            </label>
            <input
              id="block"
              className="input"
              required
              maxLength={5}
              placeholder="A"
              value={form.block}
              onChange={update("block")}
            />
          </div>
          <div>
            <label htmlFor="number" className="label">
              Apartamento
            </label>
            <input
              id="number"
              className="input"
              required
              maxLength={8}
              placeholder="101"
              value={form.number}
              onChange={update("number")}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Criando conta…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Entrar
        </Link>
      </p>
    </div>
  );
}
