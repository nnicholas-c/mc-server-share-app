import { CreateDownloadUrlRequestSchema } from "@mc-share/protocol";
import { getCoordinator } from "@/runtime";
import { jsonError, parseJson } from "@/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await parseJson(request, CreateDownloadUrlRequestSchema);
    return Response.json(await getCoordinator().createDownloadUrl(code, body));
  } catch (error) {
    return jsonError(error);
  }
}
