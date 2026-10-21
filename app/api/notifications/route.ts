import { requireApiUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await requireApiUser();
    return Response.json({
      ok: true,
      notifications: listNotifications(user.id, 20),
      unread: unreadNotificationCount(user.id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
