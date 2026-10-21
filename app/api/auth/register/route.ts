import { NextResponse } from "next/server";
import { registerMorador } from "@/lib/accounts";
import {
  SESSION_COOKIE,
  createSession,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/auth";
import { badRequest, errorResponse } from "@/lib/errors";
import { readJson, requiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (typeof body.email !== "string") throw badRequest("Informe o e-mail.");
    if (typeof body.password !== "string") throw badRequest("Informe a senha.");

    const account = registerMorador({
      name: requiredString(body, "name", "Nome", { min: 3, max: 80 }),
      email: body.email,
      password: body.password,
      block: requiredString(body, "block", "Bloco", { min: 1, max: 5 }),
      number: requiredString(body, "number", "Apartamento", { min: 1, max: 8 }),
    });

    const { token, expiresAt } = createSession(account.id);
    const response = NextResponse.json(
      {
        ok: true,
        user: account,
        redirect: homeForRole(account.role),
      },
      { status: 201 },
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
