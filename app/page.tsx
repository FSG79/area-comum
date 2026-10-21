import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  redirect("/login");
}
