import { NextResponse } from "next/server";
import { authenticate } from "@/lib/accounts";
import {
  SESSION_COOKIE,
  createSession,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/auth";
import { badRequest, errorResponse } from "@/lib/errors";
import { readJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (typeof body.email !== "string" || !body.email.trim()) {
      throw badRequest("Informe o e-mail.");
    }
    if (typeof body.password !== "string" || body.password.length === 0) {
      throw badRequest("Informe a senha.");
    }

    const account = authenticate(body.email, body.password);
    if (!account) {
      return Response.json(
        { ok: false, error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    const { token, expiresAt } = createSession(account.id);
    const response = NextResponse.json({
      ok: true,
      user: account,
      redirect: homeForRole(account.role),
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
