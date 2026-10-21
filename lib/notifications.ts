import { getDb, type NotificationRow, type Role } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import { nowIso } from "@/lib/time";

export interface NotificationView {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInput {
  type: string;
  title: string;
  message: string;
  link?: string | null;
}

function mapNotification(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function notifyUser(userId: number, input: NotificationInput): void {
  getDb()
    .prepare(
      `INSERT INTO notifications (user_id, type, title, message, link, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(userId, input.type, input.title, input.message, input.link ?? null, nowIso());
}

export function notifyUsers(userIds: number[], input: NotificationInput): void {
  const unique = [...new Set(userIds)];
  for (const userId of unique) notifyUser(userId, input);
}

export function notifyApartment(
  apartmentId: number,
  input: NotificationInput,
  options: { excludeUserId?: number } = {},
): void {
  const rows = getDb()
    .prepare("SELECT id FROM users WHERE apartment_id = ?")
    .all(apartmentId) as { id: number }[];
  const ids = rows.map((row) => row.id).filter((id) => id !== options.excludeUserId);
  notifyUsers(ids, input);
}

export function notifyRole(role: Role, input: NotificationInput): void {
  const rows = getDb().prepare("SELECT id FROM users WHERE role = ?").all(role) as {
    id: number;
  }[];
  notifyUsers(
    rows.map((row) => row.id),
    input,
  );
}

export function listNotifications(userId: number, limit = 20): NotificationView[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
    )
    .all(userId, limit) as NotificationRow[];
  return rows.map(mapNotification);
}

export function unreadNotificationCount(userId: number): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL")
      .get(userId) as { total: number }
  ).total;
}

export function markNotificationsRead(userId: number, notificationId?: number): void {
  const db = getDb();
  if (notificationId) {
    db.prepare(
      "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL",
    ).run(nowIso(), notificationId, userId);
    return;
  }
  db.prepare(
    "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
  ).run(nowIso(), userId);
}

export function notificationSummary(actor: AuthUser): {
  notifications: NotificationView[];
  unread: number;
} {
  return {
    notifications: listNotifications(actor.id, 8),
    unread: unreadNotificationCount(actor.id),
  };
}
