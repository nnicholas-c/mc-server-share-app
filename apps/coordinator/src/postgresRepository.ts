import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
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
  UploadType,
  WorldSnapshotRecord
} from "./repository";
import { conflict, notFound } from "./errors";

type Row = Record<string, unknown>;

export class PostgresRepository implements CoordinatorRepository {
  private readonly sql: NeonQueryFunction<false, false>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async createShare(input: CreateShareInput) {
    const rows = await this.sql`
      insert into shares (
        code,
        name,
        port,
        admin_token_hash,
        required_protocol_version,
        created_at
      )
      values (
        ${input.code},
        ${input.name},
        ${input.port},
        ${input.adminTokenHash},
        ${input.requiredProtocolVersion},
        ${input.createdAt.toISOString()}
      )
      returning *
    `;
    return mapShare(rows[0]);
  }

  async getShareByCode(code: string) {
    const rows = await this.sql`select * from shares where code = ${code} limit 1`;
    return rows[0] ? mapShare(rows[0]) : null;
  }

  async getShareById(id: string) {
    const rows = await this.sql`select * from shares where id = ${id} limit 1`;
    return rows[0] ? mapShare(rows[0]) : null;
  }

  async expireStaleSessions(now: Date) {
    await this.sql`
      update host_sessions
      set status = 'expired'
      where status = 'active' and expires_at <= ${now.toISOString()}
    `;
  }

  async getActiveSessionByShareId(shareId: string, now: Date) {
    const rows = await this.sql`
      select * from host_sessions
      where share_id = ${shareId}
        and status = 'active'
        and expires_at > ${now.toISOString()}
      order by created_at desc
      limit 1
    `;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async createSession(input: CreateSessionInput) {
    await this.expireStaleSessions(input.createdAt);
    try {
      const rows = await this.sql`
        insert into host_sessions (
          id,
          share_id,
          share_code,
          lock_token_hash,
          host_display_name,
          device_id_hash,
          expires_at,
          created_at
        )
        values (
          ${input.id},
          ${input.shareId},
          ${input.shareCode},
          ${input.lockTokenHash},
          ${input.hostDisplayName},
          ${input.deviceIdHash},
          ${input.expiresAt.toISOString()},
          ${input.createdAt.toISOString()}
        )
        returning *
      `;
      return mapSession(rows[0]);
    } catch (error) {
      if (String(error).includes("host_sessions_one_active_per_share")) {
        throw conflict("This share is already being hosted");
      }
      throw error;
    }
  }

  async getSessionById(id: string) {
    const rows = await this.sql`select * from host_sessions where id = ${id} limit 1`;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async updateSessionHeartbeat(id: string, expiresAt: Date) {
    const rows = await this.sql`
      update host_sessions
      set expires_at = ${expiresAt.toISOString()}
      where id = ${id}
      returning *
    `;
    if (!rows[0]) {
      throw notFound("Session not found");
    }
    return mapSession(rows[0]);
  }

  async markSessionStatus(id: string, status: SessionStatus, completedAt?: Date) {
    const rows = await this.sql`
      update host_sessions
      set status = ${status}, completed_at = ${completedAt?.toISOString() ?? null}
      where id = ${id}
      returning *
    `;
    if (!rows[0]) {
      throw notFound("Session not found");
    }
    return mapSession(rows[0]);
  }

  async getCurrentServerPackage(shareId: string) {
    const rows = await this.sql`
      select * from server_packages
      where share_id = ${shareId}
      order by version desc
      limit 1
    `;
    return rows[0] ? mapPackage(rows[0]) : null;
  }

  async createServerPackage(input: CreatePackageInput) {
    const rows = await this.sql`
      insert into server_packages (
        id,
        share_id,
        version,
        url,
        sha256,
        size,
        archive_format,
        created_at
      )
      values (
        ${input.id},
        ${input.shareId},
        ${input.version},
        ${input.url},
        ${input.sha256},
        ${input.size},
        ${input.archiveFormat},
        ${input.createdAt.toISOString()}
      )
      returning *
    `;
    return mapPackage(rows[0]);
  }

  async getLatestWorldSnapshot(shareId: string) {
    const rows = await this.sql`
      select * from world_snapshots
      where share_id = ${shareId}
      order by version desc
      limit 1
    `;
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async createWorldSnapshot(input: CreateSnapshotInput) {
    const rows = await this.sql`
      insert into world_snapshots (
        id,
        share_id,
        version,
        url,
        sha256,
        size,
        archive_format,
        host_display_name,
        created_at
      )
      values (
        ${input.id},
        ${input.shareId},
        ${input.version},
        ${input.url},
        ${input.sha256},
        ${input.size},
        ${input.archiveFormat},
        ${input.hostDisplayName},
        ${input.createdAt.toISOString()}
      )
      returning *
    `;
    return mapSnapshot(rows[0]);
  }

  async savePendingUpload(input: CreatePendingUploadInput) {
    const rows = await this.sql`
      insert into pending_uploads (
        id,
        share_id,
        session_id,
        upload_type,
        url,
        pathname,
        sha256,
        size,
        archive_format,
        created_at
      )
      values (
        ${input.id},
        ${input.shareId},
        ${input.sessionId},
        ${input.uploadType},
        ${input.url},
        ${input.pathname},
        ${input.sha256},
        ${input.size},
        ${input.archiveFormat},
        ${input.createdAt.toISOString()}
      )
      returning *
    `;
    return mapPendingUpload(rows[0]);
  }

  async getPendingUpload(input: {
    uploadType: UploadType;
    shareId: string;
    sessionId?: string | null;
    url: string;
    sha256: string;
    size: number;
  }) {
    const rows = await this.sql`
      select * from pending_uploads
      where upload_type = ${input.uploadType}
        and share_id = ${input.shareId}
        and session_id is not distinct from ${input.sessionId ?? null}
        and url = ${input.url}
        and lower(sha256) = ${input.sha256.toLowerCase()}
        and size = ${input.size}
      order by created_at desc
      limit 1
    `;
    return rows[0] ? mapPendingUpload(rows[0]) : null;
  }

  async deletePendingUpload(id: string) {
    await this.sql`delete from pending_uploads where id = ${id}`;
  }

  async pruneWorldSnapshots(shareId: string, keep: number) {
    await this.sql`
      delete from world_snapshots
      where id in (
        select id from (
          select id, row_number() over (order by version desc) as rank
          from world_snapshots
          where share_id = ${shareId} and pinned = false
        ) ranked
        where ranked.rank > ${keep}
      )
    `;
  }
}

function date(value: unknown) {
  return value instanceof Date ? value : new Date(String(value));
}

function mapShare(row: Row): ShareRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    port: Number(row.port),
    adminTokenHash: String(row.admin_token_hash),
    requiredProtocolVersion: String(row.required_protocol_version),
    createdAt: date(row.created_at)
  };
}

function mapPackage(row: Row): ServerPackageRecord {
  return {
    id: String(row.id),
    shareId: String(row.share_id),
    version: Number(row.version),
    url: String(row.url),
    sha256: String(row.sha256),
    size: Number(row.size),
    archiveFormat: row.archive_format as "tar.zst" | "zip",
    createdAt: date(row.created_at),
    pinned: Boolean(row.pinned)
  };
}

function mapSnapshot(row: Row): WorldSnapshotRecord {
  return {
    id: String(row.id),
    shareId: String(row.share_id),
    version: Number(row.version),
    url: String(row.url),
    sha256: String(row.sha256),
    size: Number(row.size),
    archiveFormat: row.archive_format as "tar.zst" | "zip",
    hostDisplayName: String(row.host_display_name),
    createdAt: date(row.created_at),
    pinned: Boolean(row.pinned)
  };
}

function mapSession(row: Row): HostSessionRecord {
  return {
    id: String(row.id),
    shareId: String(row.share_id),
    shareCode: String(row.share_code),
    lockTokenHash: String(row.lock_token_hash),
    hostDisplayName: String(row.host_display_name),
    deviceIdHash: String(row.device_id_hash),
    status: row.status as SessionStatus,
    expiresAt: date(row.expires_at),
    createdAt: date(row.created_at),
    completedAt: row.completed_at ? date(row.completed_at) : null
  };
}

function mapPendingUpload(row: Row): PendingUploadRecord {
  return {
    id: String(row.id),
    shareId: String(row.share_id),
    sessionId: row.session_id ? String(row.session_id) : null,
    uploadType: row.upload_type as UploadType,
    url: String(row.url),
    pathname: String(row.pathname),
    sha256: String(row.sha256),
    size: Number(row.size),
    archiveFormat: row.archive_format as "tar.zst" | "zip",
    createdAt: date(row.created_at)
  };
}
