import { getCoordinator } from "@/runtime";
import { jsonError } from "@/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    return Response.json(await getCoordinator().getManifest(code));
  } catch (error) {
    return jsonError(error);
  }
}
