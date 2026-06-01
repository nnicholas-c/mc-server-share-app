import type { ArchiveFormat } from "@mc-share/protocol";

export type ShareRecord = {
  id: string;
  code: string;
  name: string;
  port: number;
  adminTokenHash: string;
  requiredProtocolVersion: string;
  createdAt: Date;
};

export type ServerPackageRecord = {
  id: string;
  shareId: string;
  version: number;
  url: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
  createdAt: Date;
  pinned: boolean;
};

export type WorldSnapshotRecord = {
  id: string;
  shareId: string;
  version: number;
  url: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
  hostDisplayName: string;
  createdAt: Date;
  pinned: boolean;
};

export type SessionStatus = "active" | "completed" | "expired" | "abandoned";

export type HostSessionRecord = {
  id: string;
  shareId: string;
  shareCode: string;
  lockTokenHash: string;
  hostDisplayName: string;
  deviceIdHash: string;
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
};

export type UploadType = "world" | "package";

export type PendingUploadRecord = {
  id: string;
  shareId: string;
  sessionId: string | null;
  uploadType: UploadType;
  url: string;
  pathname: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
  createdAt: Date;
};

export type CreateShareInput = {
  code: string;
  name: string;
  port: number;
  adminTokenHash: string;
  requiredProtocolVersion: string;
  createdAt: Date;
};

export type CreateSessionInput = {
  id: string;
  shareId: string;
  shareCode: string;
  lockTokenHash: string;
  hostDisplayName: string;
  deviceIdHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export type CreateSnapshotInput = {
  id: string;
  shareId: string;
  version: number;
  url: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
  hostDisplayName: string;
  createdAt: Date;
};

export type CreatePackageInput = {
  id: string;
  shareId: string;
  version: number;
  url: string;
  sha256: string;
  size: number;
  archiveFormat: ArchiveFormat;
  createdAt: Date;
};

export type CreatePendingUploadInput = Omit<PendingUploadRecord, "id" | "createdAt"> & {
  id: string;
  createdAt: Date;
};

export interface CoordinatorRepository {
  createShare(input: CreateShareInput): Promise<ShareRecord>;
  getShareByCode(code: string): Promise<ShareRecord | null>;
  getShareById(id: string): Promise<ShareRecord | null>;
  expireStaleSessions(now: Date): Promise<void>;
  getActiveSessionByShareId(shareId: string, now: Date): Promise<HostSessionRecord | null>;
  createSession(input: CreateSessionInput): Promise<HostSessionRecord>;
  getSessionById(id: string): Promise<HostSessionRecord | null>;
  updateSessionHeartbeat(id: string, expiresAt: Date): Promise<HostSessionRecord>;
  markSessionStatus(id: string, status: SessionStatus, completedAt?: Date): Promise<HostSessionRecord>;
  getCurrentServerPackage(shareId: string): Promise<ServerPackageRecord | null>;
  createServerPackage(input: CreatePackageInput): Promise<ServerPackageRecord>;
  getLatestWorldSnapshot(shareId: string): Promise<WorldSnapshotRecord | null>;
  createWorldSnapshot(input: CreateSnapshotInput): Promise<WorldSnapshotRecord>;
  savePendingUpload(input: CreatePendingUploadInput): Promise<PendingUploadRecord>;
  getPendingUpload(input: {
    uploadType: UploadType;
    shareId: string;
    sessionId?: string | null;
    url: string;
    sha256: string;
    size: number;
  }): Promise<PendingUploadRecord | null>;
  deletePendingUpload(id: string): Promise<void>;
  pruneWorldSnapshots(shareId: string, keep: number): Promise<void>;
}
