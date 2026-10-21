import { requireApiUser } from "@/lib/auth";
import { badRequest, errorResponse, notFound } from "@/lib/errors";
import { decideReservation } from "@/lib/reservations";
import { readJson } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["sindico"]);
    const { id } = await context.params;
    const reservationId = Number(id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      throw notFound("Reserva não encontrada.");
    }
    const body = await readJson(request);
    if (body.decision !== "aprovar" && body.decision !== "recusar") {
      throw badRequest('Decisão inválida. Use "aprovar" ou "recusar".');
    }
    const reservation = decideReservation(user, reservationId, body.decision);
    return Response.json({ ok: true, reservation });
  } catch (error) {
    return errorResponse(error);
  }
}
