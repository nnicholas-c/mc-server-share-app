import { CompleteSessionRequestSchema } from "@mc-share/protocol";
import { getCoordinator } from "@/runtime";
import { jsonError, parseJson } from "@/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, CompleteSessionRequestSchema);
    return Response.json(await getCoordinator().completeSession(id, body), {
      status: 201
    });
  } catch (error) {
    return jsonError(error);
  }
}
