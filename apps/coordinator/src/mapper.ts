import type {
  HostSession,
  ServerPackage,
  ShareManifest,
  WorldSnapshot
} from "@mc-share/protocol";
import type {
  HostSessionRecord,
  ServerPackageRecord,
  ShareRecord,
  WorldSnapshotRecord
} from "./repository";

export function toServerPackage(record: ServerPackageRecord | null): ServerPackage | null {
  return record
    ? {
        id: record.id,
        version: record.version,
        url: record.url,
        sha256: record.sha256,
        size: record.size,
        archiveFormat: record.archiveFormat,
        createdAt: record.createdAt.toISOString(),
        pinned: record.pinned
      }
    : null;
}

export function toWorldSnapshot(record: WorldSnapshotRecord | null): WorldSnapshot | null {
  return record
    ? {
        id: record.id,
        version: record.version,
        url: record.url,
        sha256: record.sha256,
        size: record.size,
        archiveFormat: record.archiveFormat,
        hostDisplayName: record.hostDisplayName,
        createdAt: record.createdAt.toISOString(),
        pinned: record.pinned
      }
    : null;
}

export function toHostSession(
  record: HostSessionRecord | null,
  shareCode: string
): HostSession | null {
  return record
    ? {
        id: record.id,
        shareCode,
        hostDisplayName: record.hostDisplayName,
        expiresAt: record.expiresAt.toISOString(),
        status: record.status
      }
    : null;
}

export function toManifest(input: {
  share: ShareRecord;
  currentPackage: ServerPackageRecord | null;
  latestSnapshot: WorldSnapshotRecord | null;
  activeSession: HostSessionRecord | null;
}): ShareManifest {
  return {
    code: input.share.code,
    name: input.share.name,
    port: input.share.port,
    requiredProtocolVersion: input.share.requiredProtocolVersion,
    currentPackage: toServerPackage(input.currentPackage),
    latestSnapshot: toWorldSnapshot(input.latestSnapshot),
    activeSession: toHostSession(input.activeSession, input.share.code)
  };
}
