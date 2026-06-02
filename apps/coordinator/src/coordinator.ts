import { randomUUID } from "node:crypto";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import {
  ClaimLockRequestSchema,
  CompleteSessionRequestSchema,
  CreateDownloadUrlRequestSchema,
  CreateShareRequestSchema,
  LOCK_TTL_SECONDS,
  PROTOCOL_VERSION,
  PublishPackageRequestSchema,
  SNAPSHOT_RETENTION_COUNT,
  UploadClientPayloadSchema,
  type ClaimLockRequest,
  type CompleteSessionRequest,
  type CreateDownloadUrlRequest,
  type CreateShareRequest,
  type PublishPackageRequest,
  type UploadClientPayload
} from "@mc-share/protocol";
import { badRequest, conflict, notFound, unauthorized } from "./errors";
import { randomShareCode, randomToken, safeEqual, sha256 } from "./crypto";
import { toManifest } from "./mapper";
import type {
  CoordinatorRepository,
  HostSessionRecord,
  PendingUploadRecord,
  ShareRecord
} from "./repository";

export class CoordinatorService {
  constructor(
    private readonly repository: CoordinatorRepository,
    private readonly publicShareBaseUrl?: string
  ) {}

  async createShare(input: CreateShareRequest) {
    const request = CreateShareRequestSchema.parse(input);
    const adminToken = randomToken();
    const now = new Date();
    let share: ShareRecord | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        share = await this.repository.createShare({
          code: randomShareCode(),
          name: request.name,
          port: request.port,
          adminTokenHash: sha256(adminToken),
          requiredProtocolVersion: request.requiredProtocolVersion,
          createdAt: now
        });
        break;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
      }
    }

    if (!share) {
      throw badRequest("Unable to create a unique share code");
    }

    const manifest = await this.getManifest(share.code);
    return {
      manifest,
      adminToken,
      shareUrl: this.publicShareBaseUrl
        ? `${this.publicShareBaseUrl.replace(/\/$/, "")}/${share.code}`
        : undefined
    };
  }

  async getManifest(code: string) {
    const now = new Date();
    await this.repository.expireStaleSessions(now);
    const share = await this.requireShare(code);
    const [currentPackage, latestSnapshot, activeSession] = await Promise.all([
      this.repository.getCurrentServerPackage(share.id),
      this.repository.getLatestWorldSnapshot(share.id),
      this.repository.getActiveSessionByShareId(share.id, now)
    ]);

    return toManifest({ share, currentPackage, latestSnapshot, activeSession });
  }

  async createDownloadUrl(code: string, input: CreateDownloadUrlRequest) {
    const request = CreateDownloadUrlRequestSchema.parse(input);
    const share = await this.requireShare(code);
    const [currentPackage, latestSnapshot] = await Promise.all([
      this.repository.getCurrentServerPackage(share.id),
      this.repository.getLatestWorldSnapshot(share.id)
    ]);
    const allowedUrls = [currentPackage?.url, latestSnapshot?.url].filter(Boolean);

    if (!allowedUrls.includes(request.blobUrl)) {
      throw notFound("Download not found for this share");
    }

    const pathname = blobPathname(request.blobUrl);
    const validUntil = Date.now() + 60 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "get",
      pathname,
      access: "private",
      validUntil
    });

    return {
      url: presignedUrl,
      expiresAt: new Date(validUntil).toISOString()
    };
  }

  async claimHostLock(code: string, input: ClaimLockRequest) {
    const request = ClaimLockRequestSchema.parse(input);
    const share = await this.requireShare(code);
    const now = new Date();
    await this.repository.expireStaleSessions(now);

    const active = await this.repository.getActiveSessionByShareId(share.id, now);
    if (active) {
      throw conflict(`Hosted by ${active.hostDisplayName} until ${active.expiresAt.toISOString()}`);
    }

    const lockToken = randomToken();
    const session = await this.repository.createSession({
      id: randomUUID(),
      shareId: share.id,
      shareCode: share.code,
      lockTokenHash: sha256(lockToken),
      hostDisplayName: request.hostDisplayName,
      deviceIdHash: request.deviceIdHash,
      expiresAt: addSeconds(now, LOCK_TTL_SECONDS),
      createdAt: now
    });

    return {
      session: {
        id: session.id,
        shareCode: share.code,
        hostDisplayName: session.hostDisplayName,
        expiresAt: session.expiresAt.toISOString(),
        status: session.status
      },
      lockToken
    };
  }

  async heartbeat(sessionId: string, lockToken: string) {
    const session = await this.requireActiveSession(sessionId, lockToken);
    const updated = await this.repository.updateSessionHeartbeat(
      session.id,
      addSeconds(new Date(), LOCK_TTL_SECONDS)
    );

    return {
      session: {
        id: updated.id,
        shareCode: updated.shareCode,
        hostDisplayName: updated.hostDisplayName,
        expiresAt: updated.expiresAt.toISOString(),
        status: updated.status
      }
    };
  }

  async authorizeUpload(input: UploadClientPayload) {
    const payload = UploadClientPayloadSchema.parse(input);
    const share = await this.requireShare(payload.shareCode);

    if (payload.uploadType === "world") {
      if (!payload.sessionId || !payload.lockToken) {
        throw unauthorized("World uploads require an active host lock");
      }
      const session = await this.requireActiveSession(payload.sessionId, payload.lockToken);
      if (session.shareId !== share.id) {
        throw unauthorized("Session does not belong to share");
      }
    } else {
      if (!payload.adminToken || !safeEqual(sha256(payload.adminToken), share.adminTokenHash)) {
        throw unauthorized("Package uploads require the share admin token");
      }
    }

    return {
      share,
      tokenPayload: JSON.stringify({
        uploadType: payload.uploadType,
        shareId: share.id,
        shareCode: share.code,
        sessionId: payload.sessionId ?? null,
        expectedSha256: payload.expectedSha256.toLowerCase(),
        size: payload.size,
        archiveFormat: payload.archiveFormat
      })
    };
  }

  async recordCompletedUpload(input: {
    uploadType: "world" | "package";
    shareId: string;
    sessionId: string | null;
    url: string;
    pathname: string;
    sha256: string;
    size: number;
    archiveFormat: "tar.zst" | "zip";
  }) {
    return this.repository.savePendingUpload({
      id: randomUUID(),
      shareId: input.shareId,
      sessionId: input.sessionId,
      uploadType: input.uploadType,
      url: input.url,
      pathname: input.pathname,
      sha256: input.sha256.toLowerCase(),
      size: input.size,
      archiveFormat: input.archiveFormat,
      createdAt: new Date()
    });
  }

  async completeSession(sessionId: string, input: CompleteSessionRequest) {
    const request = CompleteSessionRequestSchema.parse(input);
    const session = await this.requireActiveSession(sessionId, request.lockToken);

    const pendingUpload = await this.requirePendingUpload({
      uploadType: "world",
      shareId: session.shareId,
      sessionId: session.id,
      url: request.blobUrl,
      sha256: request.sha256,
      size: request.size
    });

    if (pendingUpload.archiveFormat !== request.archiveFormat) {
      throw badRequest("Uploaded archive format does not match completion request");
    }

    const latest = await this.repository.getLatestWorldSnapshot(session.shareId);
    const snapshot = await this.repository.createWorldSnapshot({
      id: randomUUID(),
      shareId: session.shareId,
      version: (latest?.version ?? 0) + 1,
      url: request.blobUrl,
      sha256: request.sha256.toLowerCase(),
      size: request.size,
      archiveFormat: request.archiveFormat,
      hostDisplayName: request.hostDisplayName,
      createdAt: new Date()
    });

    await this.repository.markSessionStatus(session.id, "completed", new Date());
    await this.repository.deletePendingUpload(pendingUpload.id);
    await this.repository.pruneWorldSnapshots(session.shareId, SNAPSHOT_RETENTION_COUNT);

    return { snapshot };
  }

  async publishPackage(code: string, input: PublishPackageRequest) {
    const request = PublishPackageRequestSchema.parse(input);
    const share = await this.requireShare(code);

    if (!safeEqual(sha256(request.adminToken), share.adminTokenHash)) {
      throw unauthorized("Invalid admin token");
    }

    const pendingUpload = await this.requirePendingUpload({
      uploadType: "package",
      shareId: share.id,
      sessionId: null,
      url: request.blobUrl,
      sha256: request.sha256,
      size: request.size
    });

    if (pendingUpload.archiveFormat !== request.archiveFormat) {
      throw badRequest("Uploaded archive format does not match publish request");
    }

    const latest = await this.repository.getCurrentServerPackage(share.id);
    const serverPackage = await this.repository.createServerPackage({
      id: randomUUID(),
      shareId: share.id,
      version: (latest?.version ?? 0) + 1,
      url: request.blobUrl,
      sha256: request.sha256.toLowerCase(),
      size: request.size,
      archiveFormat: request.archiveFormat,
      createdAt: new Date()
    });

    await this.repository.deletePendingUpload(pendingUpload.id);
    return { serverPackage };
  }

  private async requireShare(code: string) {
    const share = await this.repository.getShareByCode(code);
    if (!share) {
      throw notFound("Share not found");
    }
    return share;
  }

  private async requireActiveSession(sessionId: string, lockToken: string) {
    const now = new Date();
    await this.repository.expireStaleSessions(now);
    const session = await this.repository.getSessionById(sessionId);

    if (!session || session.status !== "active" || session.expiresAt <= now) {
      throw unauthorized("Host lock is not active");
    }

    if (!safeEqual(sha256(lockToken), session.lockTokenHash)) {
      throw unauthorized("Invalid lock token");
    }

    return session;
  }

  private async requirePendingUpload(input: {
    uploadType: "world" | "package";
    shareId: string;
    sessionId?: string | null;
    url: string;
    sha256: string;
    size: number;
  }): Promise<PendingUploadRecord> {
    const pendingUpload = await this.repository.getPendingUpload(input);
    if (!pendingUpload) {
      throw badRequest("No completed upload matches this publish request");
    }
    return pendingUpload;
  }
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function blobPathname(blobUrl: string) {
  const pathname = new URL(blobUrl).pathname.replace(/^\/+/, "");
  if (!pathname) {
    throw badRequest("Blob URL does not contain a pathname");
  }
  return pathname;
}
