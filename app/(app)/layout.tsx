import { requireUser } from "@/lib/auth";
import { notificationSummary } from "@/lib/notifications";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { notifications, unread } = notificationSummary(user);

  return (
    <div className="min-h-screen">
      <AppNav
        user={{ name: user.name, role: user.role, apartmentLabel: user.apartmentLabel }}
        notifications={notifications}
        unread={unread}
      />
      <main className="lg:pl-[272px]">
        <div className="mx-auto max-w-[1220px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
