# Migration Checklist

The legacy repo committed the active Minecraft server, world, logs, local
ngrok binary, and per-user config. The new app treats those files as local data.

## 1. Keep The Current Server Local

The `server1.20.4` folder is now ignored by Git. Do not delete it if you still
need the current RLCraft/Dregora world.

## 2. Install The New Toolchain

Install Node.js 24 LTS, Rust stable, Java, and the playit.gg client. Then run:

```powershell
npm install
npm run test
```

## 3. Configure The Coordinator

Deploy `apps/coordinator` to Vercel and add:

- `DATABASE_URL` from Neon Postgres
- `BLOB_READ_WRITE_TOKEN` from Vercel Blob
- `PUBLIC_SHARE_BASE_URL` for desktop share links

Apply the SQL in `apps/coordinator/db/schema.sql`.

## 4. Import The Legacy Server

Open the desktop app and import `server1.20.4`.

The app detects:

- `server.properties`
- `level-name`
- `server-port`
- likely Forge/Fabric/Paper/vanilla start command
- default world folders

Publish an initial server package with the share admin token, then publish the
first world snapshot while holding the host lock.

## 5. Retire The Batch Flow

Do not use `change-world.bat` or `start.bat` for shared hosting anymore. They
can still exist in your local ignored folder, but GitHub is no longer the world
sync mechanism.
