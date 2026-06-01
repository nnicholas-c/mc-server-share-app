import { PublishPackageRequestSchema } from "@mc-share/protocol";
import { getCoordinator } from "@/runtime";
import { jsonError, parseJson } from "@/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await parseJson(request, PublishPackageRequestSchema);
    return Response.json(await getCoordinator().publishPackage(code, body), {
      status: 201
    });
  } catch (error) {
    return jsonError(error);
  }
}
