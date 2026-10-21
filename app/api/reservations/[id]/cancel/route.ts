import { requireApiUser } from "@/lib/auth";
import { badRequest, errorResponse, notFound } from "@/lib/errors";
import { cancelReservation } from "@/lib/reservations";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["morador"]);
    const { id } = await context.params;
    const reservationId = Number(id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      throw notFound("Reserva não encontrada.");
    }
    const result = cancelReservation(user, reservationId);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
