import { upload } from "@vercel/blob/client";
import { readFile } from "@tauri-apps/plugin-fs";
import type { ArchiveFormat } from "@mc-share/protocol";

export type LocalArchive = {
  path: string;
  fileName: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
};

export type UploadedBlob = {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
};

export async function uploadArchive(input: {
  archive: LocalArchive;
  coordinatorUrl: string;
  endpoint: "/api/uploads/world-token" | "/api/uploads/package-token";
  clientPayload: Record<string, unknown>;
}): Promise<UploadedBlob> {
  const bytes = await readFile(input.archive.path);
  const file = new File([bytes], input.archive.fileName, {
    type: input.archive.archiveFormat === "zip" ? "application/zip" : "application/zstd"
  });

  return upload(input.archive.fileName, file, {
    access: "public",
    handleUploadUrl: `${input.coordinatorUrl.replace(/\/$/, "")}${input.endpoint}`,
    clientPayload: JSON.stringify(input.clientPayload)
  });
}
