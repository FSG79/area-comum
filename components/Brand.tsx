import Link from "next/link";

export function Brand({
  tone = "dark",
  href = "/",
}: {
  tone?: "dark" | "light";
  href?: string;
}) {
  const title = tone === "dark" ? "text-cream-50" : "text-ink-900";
  const subtitle = tone === "dark" ? "text-cream-100/55" : "text-ink-400";
  return (
    <Link href={href} className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/emblem-sc-badge.png"
        alt="Logo do Condomínio São Cristóvão"
        className="h-11 w-11 rounded-full shadow-soft ring-1 ring-white/10"
      />
      <span className="leading-none">
        <span className={`block font-display text-[1.2rem] font-medium tracking-tight ${title}`}>
          São Cristóvão
        </span>
        <span
          className={`mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.24em] ${subtitle}`}
        >
          Condomínio · Área Comum
        </span>
      </span>
    </Link>
  );
}
