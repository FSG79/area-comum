import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Criar conta · Área Comum",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
