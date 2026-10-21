import { requireApiUser } from "@/lib/auth";
import { updateArea, type AreaInput } from "@/lib/areas";
import { errorResponse, notFound } from "@/lib/errors";
import {
  booleanFlag,
  optionalString,
  readJson,
  requiredInt,
  requiredString,
} from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["sindico"]);
    const { id } = await context.params;
    const areaId = Number(id);
    if (!Number.isInteger(areaId) || areaId <= 0) throw notFound("Área não encontrada.");
    const body = await readJson(request);
    const input: AreaInput = {
      name: requiredString(body, "name", "Nome da área", { min: 2, max: 60 }),
      description: optionalString(body, "description", "Descrição", 300),
      guestLimit: requiredInt(body, "guestLimit", "Limite de convidados", {
        min: 1,
        max: 1000,
      }),
      requiresApproval: booleanFlag(body, "requiresApproval", false),
      minAdvanceDays: requiredInt(body, "minAdvanceDays", "Antecedência mínima", {
        min: 0,
        max: 30,
      }),
      openTime: requiredString(body, "openTime", "Horário de abertura", { min: 4, max: 5 }),
      closeTime: requiredString(body, "closeTime", "Horário de fechamento", { min: 4, max: 5 }),
    };
    const area = updateArea(user, areaId, input);
    return Response.json({ ok: true, area });
  } catch (error) {
    return errorResponse(error);
  }
}
