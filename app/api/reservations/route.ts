import { requireApiUser } from "@/lib/auth";
import { badRequest, errorResponse } from "@/lib/errors";
import { createReservation, listDay } from "@/lib/reservations";
import { isValidDate, todayISO } from "@/lib/time";
import {
  optionalString,
  readJson,
  requiredInt,
  requiredString,
} from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayISO();
    if (!isValidDate(date)) throw badRequest("Data inválida.");
    const areaParam = url.searchParams.get("areaId");
    let areaId: number | undefined;
    if (areaParam) {
      areaId = Number(areaParam);
      if (!Number.isInteger(areaId) || areaId <= 0) throw badRequest("Área inválida.");
    }
    const reservations = listDay(user, date, areaId);
    return Response.json({ ok: true, date, reservations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["morador"]);
    const body = await readJson(request);
    const reservation = createReservation(user, {
      areaId: requiredInt(body, "areaId", "Área", { min: 1, max: 1_000_000 }),
      date: requiredString(body, "date", "Data", { min: 10, max: 10 }),
      startTime: requiredString(body, "startTime", "Horário de início", { min: 4, max: 5 }),
      endTime: requiredString(body, "endTime", "Horário de término", { min: 4, max: 5 }),
      guests: requiredInt(body, "guests", "Convidados", { min: 1, max: 1000 }),
      notes: optionalString(body, "notes", "Observações", 200),
    });
    return Response.json({ ok: true, reservation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
