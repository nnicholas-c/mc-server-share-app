import { handleUpload } from "@vercel/blob/client";
import { UploadClientPayloadSchema } from "@mc-share/protocol";
import { getCoordinator } from "./runtime";

type TokenPayload = {
  uploadType: "world" | "package";
  shareId: string;
  shareCode: string;
  sessionId: string | null;
  expectedSha256: string;
  size: number;
  archiveFormat: "tar.zst" | "zip";
};

export async function handleBlobUploadRequest(request: Request) {
  const body = await request.json();
  const coordinator = getCoordinator();

  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (_pathname, clientPayload) => {
      const payload = UploadClientPayloadSchema.parse(
        JSON.parse(clientPayload ?? "{}")
      );
      const authorized = await coordinator.authorizeUpload(payload);

      return {
        allowedContentTypes: [
          "application/zstd",
          "application/x-tar",
          "application/zip",
          "application/octet-stream"
        ],
        addRandomSuffix: false,
        tokenPayload: authorized.tokenPayload
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const payload = JSON.parse(tokenPayload ?? "{}") as TokenPayload;
      await coordinator.recordCompletedUpload({
        uploadType: payload.uploadType,
        shareId: payload.shareId,
        sessionId: payload.sessionId,
        url: blob.url,
        pathname: blob.pathname,
        sha256: payload.expectedSha256,
        size: payload.size,
        archiveFormat: payload.archiveFormat
      });
    }
  });
}
