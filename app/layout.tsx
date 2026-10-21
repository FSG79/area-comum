import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Área Comum — Reservas do condomínio",
  description:
    "Sistema de reservas das áreas comuns do condomínio: agenda, aprovações, regras e controle de chaves.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
