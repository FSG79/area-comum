import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function POST() {
  try {
    const cookieStore = await cookies();
    destroySession(cookieStore.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
