import { requireApiUser } from "@/lib/auth";
import { badRequest, errorResponse, notFound } from "@/lib/errors";
import { registerKeyEvent } from "@/lib/reservations";
import { readJson } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["porteiro"]);
    const { id } = await context.params;
    const reservationId = Number(id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      throw notFound("Reserva não encontrada.");
    }
    const body = await readJson(request);
    if (body.action !== "entrega" && body.action !== "devolucao") {
      throw badRequest('Ação inválida. Use "entrega" ou "devolucao".');
    }
    const reservation = registerKeyEvent(user, reservationId, body.action);
    return Response.json({ ok: true, reservation });
  } catch (error) {
    return errorResponse(error);
  }
}
