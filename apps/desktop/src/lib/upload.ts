import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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

export type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

type NativeUploadProgress = UploadProgress & {
  uploadId: string;
};

export async function uploadArchive(input: {
  archive: LocalArchive;
  coordinatorUrl: string;
  endpoint: "/api/uploads/world-token" | "/api/uploads/package-token";
  clientPayload: Record<string, unknown>;
  onUploadProgress?: (progress: UploadProgress) => void;
}): Promise<UploadedBlob> {
  const uploadId = createUploadId();
  const unlisten = input.onUploadProgress
    ? await listen<NativeUploadProgress>("archive-upload-progress", (event) => {
        if (event.payload.uploadId === uploadId) {
          input.onUploadProgress?.(event.payload);
        }
      })
    : undefined;

  try {
    return await invoke<UploadedBlob>("upload_archive", {
      archive: input.archive,
      coordinatorUrl: input.coordinatorUrl,
      endpoint: input.endpoint,
      clientPayload: input.clientPayload,
      uploadId
    });
  } finally {
    unlisten?.();
  }
}

function createUploadId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
