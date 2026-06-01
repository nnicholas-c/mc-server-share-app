create extension if not exists pgcrypto;

create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  port integer not null,
  admin_token_hash text not null,
  required_protocol_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists server_packages (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  version integer not null,
  url text not null,
  sha256 text not null,
  size bigint not null,
  archive_format text not null,
  created_at timestamptz not null default now(),
  pinned boolean not null default false,
  unique (share_id, version)
);

create table if not exists world_snapshots (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  version integer not null,
  url text not null,
  sha256 text not null,
  size bigint not null,
  archive_format text not null,
  host_display_name text not null,
  created_at timestamptz not null default now(),
  pinned boolean not null default false,
  unique (share_id, version)
);

create table if not exists host_sessions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  share_code text not null,
  lock_token_hash text not null,
  host_display_name text not null,
  device_id_hash text not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists host_sessions_one_active_per_share
  on host_sessions(share_id)
  where status = 'active';

create index if not exists host_sessions_share_status_idx
  on host_sessions(share_id, status, expires_at);

create table if not exists pending_uploads (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  session_id uuid references host_sessions(id) on delete cascade,
  upload_type text not null,
  url text not null,
  pathname text not null,
  sha256 text not null,
  size bigint not null,
  archive_format text not null,
  created_at timestamptz not null default now()
);

create index if not exists pending_uploads_publish_idx
  on pending_uploads(upload_type, share_id, session_id, url, sha256, size);
