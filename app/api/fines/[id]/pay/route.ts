import { requireApiUser } from "@/lib/auth";
import { errorResponse, notFound } from "@/lib/errors";
import { payFine } from "@/lib/fines";
import type { PaymentMethod } from "@/lib/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const fineId = Number(id);
    if (!Number.isInteger(fineId) || fineId <= 0) throw notFound("Multa não encontrada.");

    let method: PaymentMethod = "manual";
    try {
      const body = (await request.json()) as { method?: string };
      if (body?.method === "pix" || body?.method === "cartao" || body?.method === "manual") {
        method = body.method;
      }
    } catch {
      // corpo vazio = quitação manual pelo painel do síndico
    }

    const result = payFine(user, fineId, method);
    return Response.json({ ok: true, fine: result.fine, payment: result.payment });
  } catch (error) {
    return errorResponse(error);
  }
}
