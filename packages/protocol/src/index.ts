import { z } from "zod";

export const PROTOCOL_VERSION = "1";
export const LOCK_TTL_SECONDS = 300;
export const SNAPSHOT_RETENTION_COUNT = 10;

export const ArchiveFormatSchema = z.enum(["tar.zst", "zip"]);
export type ArchiveFormat = z.infer<typeof ArchiveFormatSchema>;

export const ServerTypeSchema = z.enum([
  "vanilla",
  "forge",
  "fabric",
  "paper",
  "unknown"
]);
export type ServerType = z.infer<typeof ServerTypeSchema>;

export const ServerPackageSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().nonnegative(),
  archiveFormat: ArchiveFormatSchema,
  createdAt: z.string().datetime(),
  pinned: z.boolean().default(false)
});
export type ServerPackage = z.infer<typeof ServerPackageSchema>;

export const WorldSnapshotSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().nonnegative(),
  archiveFormat: ArchiveFormatSchema,
  hostDisplayName: z.string().min(1),
  createdAt: z.string().datetime(),
  pinned: z.boolean().default(false)
});
export type WorldSnapshot = z.infer<typeof WorldSnapshotSchema>;

export const HostSessionSchema = z.object({
  id: z.string(),
  shareCode: z.string(),
  hostDisplayName: z.string(),
  expiresAt: z.string().datetime(),
  status: z.enum(["active", "completed", "expired", "abandoned"])
});
export type HostSession = z.infer<typeof HostSessionSchema>;

export const ShareManifestSchema = z.object({
  code: z.string(),
  name: z.string(),
  port: z.number().int().positive(),
  requiredProtocolVersion: z.string(),
  currentPackage: ServerPackageSchema.nullable(),
  latestSnapshot: WorldSnapshotSchema.nullable(),
  activeSession: HostSessionSchema.nullable()
});
export type ShareManifest = z.infer<typeof ShareManifestSchema>;

export const DesktopProfileSchema = z.object({
  serverPath: z.string().min(1),
  serverType: ServerTypeSchema,
  startCommand: z.string().min(1),
  javaPath: z.string().min(1).default("java"),
  memoryMb: z.number().int().positive().default(4096),
  serverPort: z.number().int().positive().default(25565),
  levelName: z.string().min(1).default("world"),
  worldIncludes: z.array(z.string()).default(["world"]),
  worldExcludes: z.array(z.string()).default([
    "session.lock",
    "logs",
    "crash-reports"
  ]),
  playitPath: z.string().optional(),
  coordinatorUrl: z.string().url().optional(),
  shareCode: z.string().optional()
});
export type DesktopProfile = z.infer<typeof DesktopProfileSchema>;

export const CreateShareRequestSchema = z.object({
  name: z.string().min(1).max(80),
  port: z.number().int().positive().default(25565),
  requiredProtocolVersion: z.string().default(PROTOCOL_VERSION)
});
export type CreateShareRequest = z.infer<typeof CreateShareRequestSchema>;

export const CreateShareResponseSchema = z.object({
  manifest: ShareManifestSchema,
  adminToken: z.string(),
  shareUrl: z.string().url().optional()
});
export type CreateShareResponse = z.infer<typeof CreateShareResponseSchema>;

export const ClaimLockRequestSchema = z.object({
  hostDisplayName: z.string().min(1).max(80),
  deviceIdHash: z.string().min(8).max(128)
});
export type ClaimLockRequest = z.infer<typeof ClaimLockRequestSchema>;

export const ClaimLockResponseSchema = z.object({
  session: HostSessionSchema,
  lockToken: z.string()
});
export type ClaimLockResponse = z.infer<typeof ClaimLockResponseSchema>;

export const HeartbeatRequestSchema = z.object({
  lockToken: z.string().min(16)
});
export type HeartbeatRequest = z.infer<typeof HeartbeatRequestSchema>;

export const UploadClientPayloadSchema = z.object({
  uploadType: z.enum(["world", "package"]),
  shareCode: z.string(),
  sessionId: z.string().optional(),
  lockToken: z.string().optional(),
  adminToken: z.string().optional(),
  expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().positive(),
  archiveFormat: ArchiveFormatSchema
});
export type UploadClientPayload = z.infer<typeof UploadClientPayloadSchema>;

export const CompleteSessionRequestSchema = z.object({
  lockToken: z.string().min(16),
  blobUrl: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().positive(),
  archiveFormat: ArchiveFormatSchema,
  hostDisplayName: z.string().min(1).max(80)
});
export type CompleteSessionRequest = z.infer<
  typeof CompleteSessionRequestSchema
>;

export const PublishPackageRequestSchema = z.object({
  adminToken: z.string().min(16),
  blobUrl: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().positive(),
  archiveFormat: ArchiveFormatSchema
});
export type PublishPackageRequest = z.infer<typeof PublishPackageRequestSchema>;

export const CreateDownloadUrlRequestSchema = z.object({
  blobUrl: z.string().url()
});
export type CreateDownloadUrlRequest = z.infer<
  typeof CreateDownloadUrlRequestSchema
>;

export const CreateDownloadUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime()
});
export type CreateDownloadUrlResponse = z.infer<
  typeof CreateDownloadUrlResponseSchema
>;
