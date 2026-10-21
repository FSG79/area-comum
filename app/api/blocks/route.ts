import { requireApiUser } from "@/lib/auth";
import { createBlock } from "@/lib/blocks";
import { errorResponse } from "@/lib/errors";
import { optionalString, readJson, requiredInt, requiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["sindico"]);
    const body = await readJson(request);
    const block = createBlock(user, {
      areaId: requiredInt(body, "areaId", "Área", { min: 1, max: 1_000_000 }),
      date: requiredString(body, "date", "Data", { min: 10, max: 10 }),
      reason: optionalString(body, "reason", "Motivo", 200),
    });
    return Response.json({ ok: true, block }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
