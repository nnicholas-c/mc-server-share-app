import { handleBlobUploadRequest } from "@/blobUpload";
import { jsonError } from "@/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return await handleBlobUploadRequest(request);
  } catch (error) {
    return jsonError(error);
  }
}
