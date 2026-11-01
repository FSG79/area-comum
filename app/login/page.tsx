import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Entrar · Condomínio Exemplo",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
