import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, type Role, type UserRow } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/errors";

export const SESSION_COOKIE = "area_comum_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  apartmentId: number | null;
  apartmentLabel: string | null;
}

interface SessionUserRow extends UserRow {
  apartment_label: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function homeForRole(role: Role): string {
  if (role === "sindico") return "/admin";
  if (role === "porteiro") return "/portaria";
  return "/inicio";
}

export function createSession(userId: number): { token: string; expiresAt: string } {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    "INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(userId, hashToken(token), expiresAt, new Date().toISOString());
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  return { token, expiresAt };
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: new Date(expiresAt),
  };
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.*, a.label AS apartment_label
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN apartments a ON a.id = u.apartment_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as SessionUserRow | undefined;

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
  };
});

export async function requireUser(roles?: Role[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

/** Versão usada nas rotas de API: nunca redireciona, retorna 401/403. */
export async function requireApiUser(roles?: Role[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  if (roles && !roles.includes(user.role)) throw forbidden();
  return user;
}
