import { randomUUID } from "node:crypto";
import type {
  CoordinatorRepository,
  CreatePackageInput,
  CreatePendingUploadInput,
  CreateSessionInput,
  CreateShareInput,
  CreateSnapshotInput,
  HostSessionRecord,
  PendingUploadRecord,
  ServerPackageRecord,
  SessionStatus,
  ShareRecord,
  WorldSnapshotRecord
} from "./repository";
import { conflict, notFound } from "./errors";

export class MemoryRepository implements CoordinatorRepository {
  private shares = new Map<string, ShareRecord>();
  private shareCodes = new Map<string, string>();
  private sessions = new Map<string, HostSessionRecord>();
  private packages: ServerPackageRecord[] = [];
  private snapshots: WorldSnapshotRecord[] = [];
  private pendingUploads = new Map<string, PendingUploadRecord>();

  async createShare(input: CreateShareInput) {
    if (this.shareCodes.has(input.code)) {
      throw conflict("Share code already exists");
    }

    const share: ShareRecord = {
      id: randomUUID(),
      ...input
    };
    this.shares.set(share.id, share);
    this.shareCodes.set(share.code, share.id);
    return share;
  }

  async getShareByCode(code: string) {
    const id = this.shareCodes.get(code);
    return id ? this.shares.get(id) ?? null : null;
  }

  async getShareById(id: string) {
    return this.shares.get(id) ?? null;
  }

  async expireStaleSessions(now: Date) {
    for (const session of this.sessions.values()) {
      if (session.status === "active" && session.expiresAt <= now) {
        session.status = "expired";
      }
    }
  }

  async getActiveSessionByShareId(shareId: string, now: Date) {
    await this.expireStaleSessions(now);
    return (
      [...this.sessions.values()].find(
        (session) => session.shareId === shareId && session.status === "active"
      ) ?? null
    );
  }

  async createSession(input: CreateSessionInput) {
    const active = await this.getActiveSessionByShareId(input.shareId, input.createdAt);
    if (active) {
      throw conflict("This share is already being hosted");
    }

    const session: HostSessionRecord = {
      ...input,
      status: "active",
      completedAt: null
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSessionById(id: string) {
    return this.sessions.get(id) ?? null;
  }

  async updateSessionHeartbeat(id: string, expiresAt: Date) {
    const session = this.sessions.get(id);
    if (!session) {
      throw notFound("Session not found");
    }
    session.expiresAt = expiresAt;
    return session;
  }

  async markSessionStatus(id: string, status: SessionStatus, completedAt?: Date) {
    const session = this.sessions.get(id);
    if (!session) {
      throw notFound("Session not found");
    }
    session.status = status;
    session.completedAt = completedAt ?? session.completedAt;
    return session;
  }

  async getCurrentServerPackage(shareId: string) {
    return (
      this.packages
        .filter((item) => item.shareId === shareId)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async createServerPackage(input: CreatePackageInput) {
    const record: ServerPackageRecord = { ...input, pinned: false };
    this.packages.push(record);
    return record;
  }

  async getLatestWorldSnapshot(shareId: string) {
    return (
      this.snapshots
        .filter((item) => item.shareId === shareId)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async createWorldSnapshot(input: CreateSnapshotInput) {
    const record: WorldSnapshotRecord = { ...input, pinned: false };
    this.snapshots.push(record);
    return record;
  }

  async savePendingUpload(input: CreatePendingUploadInput) {
    const record: PendingUploadRecord = { ...input };
    this.pendingUploads.set(record.id, record);
    return record;
  }

  async getPendingUpload(input: {
    uploadType: "world" | "package";
    shareId: string;
    sessionId?: string | null;
    url: string;
    sha256: string;
    size: number;
  }) {
    return (
      [...this.pendingUploads.values()].find(
        (upload) =>
          upload.uploadType === input.uploadType &&
          upload.shareId === input.shareId &&
          upload.sessionId === (input.sessionId ?? null) &&
          upload.url === input.url &&
          upload.sha256.toLowerCase() === input.sha256.toLowerCase() &&
          upload.size === input.size
      ) ?? null
    );
  }

  async deletePendingUpload(id: string) {
    this.pendingUploads.delete(id);
  }

  async pruneWorldSnapshots(shareId: string, keep: number) {
    const removable = this.snapshots
      .filter((item) => item.shareId === shareId && !item.pinned)
      .sort((a, b) => b.version - a.version)
      .slice(keep);

    const removeIds = new Set(removable.map((item) => item.id));
    this.snapshots = this.snapshots.filter((item) => !removeIds.has(item.id));
  }
}
