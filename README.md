# MC Server Share

MC Server Share is being rebuilt as a general-purpose Minecraft Java Edition
server sharing app. Instead of committing live world files to Git and exposing a
hard-coded ngrok tunnel, the repo now contains:

- `apps/desktop`: a Tauri + React desktop app for importing a server folder,
  claiming a host lock, starting the server, starting playit.gg, and publishing
  updated world snapshots.
- `apps/coordinator`: a Vercel-hosted coordinator API backed by Neon Postgres
  and Vercel Blob.
- `packages/protocol`: shared TypeScript types and validation schemas used by
  the app and API.

The old `server1.20.4` folder is intentionally ignored. It can stay on your
machine as a local import source, but it should not be pushed as source code.

## Prerequisites

- Node.js 24 LTS or newer
- Rust stable and Cargo
- Java installed for the Minecraft server you want to host
- A playit.gg account and local playit client
- A Vercel project with Vercel Blob and Neon Postgres configured

## Setup

```powershell
npm install
npm run test
npm run typecheck
```

Copy the coordinator environment template:

```powershell
Copy-Item apps/coordinator/.env.example apps/coordinator/.env.local
```

Then fill in the Vercel Blob and Neon values.

## Development

Run the coordinator:

```powershell
npm run dev --workspace @mc-share/coordinator
```

Run the desktop app:

```powershell
npm run dev --workspace @mc-share/desktop
```

## Migration From The Current Repo

The previous batch-file workflow has been replaced by the desktop app and
coordinator. To keep local data safe, the old server folder is left on disk and
ignored by Git. Import that folder from the desktop app, then publish the server
package and first world snapshot through a share.

See [docs/migration.md](docs/migration.md) for the exact migration checklist.
If you need to shrink old Git history after the migration, see
[docs/history-cleanup.md](docs/history-cleanup.md).
