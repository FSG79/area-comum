import { requireApiUser } from "@/lib/auth";
import { deleteBlock } from "@/lib/blocks";
import { errorResponse, notFound } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["sindico"]);
    const { id } = await context.params;
    const blockId = Number(id);
    if (!Number.isInteger(blockId) || blockId <= 0) throw notFound("Bloqueio não encontrado.");
    deleteBlock(user, blockId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
