import { requireApiUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { markNotificationsRead, unreadNotificationCount } from "@/lib/notifications";
import { readJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    let id: number | undefined;
    try {
      const body = await readJson(request);
      if (body.id !== undefined) {
        const parsed = Number(body.id);
        if (Number.isInteger(parsed) && parsed > 0) id = parsed;
      }
    } catch {
      // sem corpo = marcar todas
    }
    markNotificationsRead(user.id, id);
    return Response.json({ ok: true, unread: unreadNotificationCount(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
