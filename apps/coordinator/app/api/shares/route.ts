import { CreateShareRequestSchema } from "@mc-share/protocol";
import { getCoordinator } from "@/runtime";
import { jsonError, parseJson } from "@/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, CreateShareRequestSchema);
    return Response.json(await getCoordinator().createShare(body), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
