import { Brand } from "@/components/Brand";

const highlights = [
  "Agenda, calendário e reservas das áreas comuns",
  "Aprovações do síndico e bloqueios de manutenção",
  "Controle de chaves pela portaria",
  "Multas, pagamentos e notificações em um só lugar",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-900 px-12 py-10 text-cream-100 lg:flex lg:flex-col xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(700px 420px at 85% 8%, rgba(224,173,67,.18), transparent 62%), radial-gradient(520px 360px at 8% 92%, rgba(109,148,134,.25), transparent 60%)",
          }}
        />
        {/* Marca d'água do condomínio */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/emblem-sc.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-24 top-24 w-[430px] select-none opacity-[0.1]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/emblem-sc.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 w-[340px] opacity-[0.07] select-none"
        />

        <div className="relative flex items-center justify-between">
          <Brand tone="dark" />
          <span className="rounded-full border border-cream-100/15 bg-white/[0.04] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-cream-100/60">
            Gestão de convivência
          </span>
        </div>

        <div className="relative my-auto max-w-xl py-12">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest2 text-gold-300">
            <span className="h-px w-8 bg-gold-400/60" />A convivência começa aqui
          </p>
          <h1 className="mt-5 max-w-[440px] font-display text-[clamp(3rem,5vw,4.7rem)] font-medium leading-[0.98] tracking-tight text-cream-50">
            O condomínio
            <br />
            inteiro,
            <br />
            <em className="text-gold-300">em sintonia.</em>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-cream-100/65">
            Reservas sem caderno na portaria, regras claras e cada pessoa vendo exatamente o que
            precisa. A portaria, o síndico e os moradores no mesmo ritmo.
          </p>

          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[13px] text-cream-100/75">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-300/30 bg-gold-300/10 text-[10px] font-bold text-gold-300">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="pointer-events-none absolute right-0 top-24 hidden w-[230px] rotate-[-4deg] rounded-2xl border border-cream-100/15 bg-cream-50/95 p-4 text-ink-900 shadow-lift 2xl:block">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-gold-700">
              Hoje · Quadra
            </p>
            <p className="mt-1 font-display text-2xl leading-none">19:00</p>
            <p className="mt-1 text-[10px] text-ink-500">Apto A-404 · 12 convidados</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
              Confirmada
            </span>
          </div>
          <div className="pointer-events-none absolute -right-8 top-[19rem] hidden w-[240px] rotate-[3deg] rounded-2xl border border-white/10 bg-ink-800/95 p-4 text-cream-100 shadow-lift 2xl:block">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-gold-300">
              Aprovação
            </p>
            <p className="mt-1 font-display text-lg leading-tight text-cream-50">
              Salão de Festas
            </p>
            <p className="mt-1 text-[10px] text-cream-100/50">
              Apto A-101 · 60 pessoas · 25 out
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-300/15 px-2 py-0.5 text-[9px] font-semibold text-gold-200">
              Aguardando o síndico
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-cream-100/10 pt-5 text-[9px] uppercase tracking-[0.18em] text-cream-100/30">
          <span>Condomínio Exemplo</span>
          <span>Next.js · SQLite</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 100% 0%, rgba(224,173,67,.12), transparent 60%)",
          }}
        />
        <div className="relative w-full max-w-[430px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand tone="light" />
          </div>
          {children}
          <p className="mt-8 text-center text-[9px] uppercase tracking-[0.2em] text-ink-300">
            Condomínio Exemplo · Uso exclusivo de moradores
          </p>
        </div>
      </section>
    </main>
  );
}
