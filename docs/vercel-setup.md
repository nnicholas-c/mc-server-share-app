# Vercel Setup

Use Vercel for the public coordinator web app. Use GitHub for source code and
desktop installer releases.

## 1. Create Storage

In Vercel, add these project resources:

- Neon Postgres
- Vercel Blob

Apply `apps/coordinator/db/schema.sql` to the Neon database.

## 2. Import The GitHub Repo

Import `nnicholas-c/mc-server-share-app` into Vercel.

Recommended project settings:

- Framework preset: Next.js
- Root Directory: `apps/coordinator`
- Install Command: `npm ci`
- Build Command: `npm run build`

Vercel detects the root `package-lock.json` and workspace packages from the
monorepo checkout.

## 3. Add Environment Variables

Add these to Production, Preview, and Development as needed:

```env
DATABASE_URL="postgres://user:password@host/db?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
PUBLIC_COORDINATOR_URL="https://your-coordinator.vercel.app"
PUBLIC_SHARE_BASE_URL="https://your-coordinator.vercel.app/share"
NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL="https://github.com/nnicholas-c/mc-server-share-app/releases/latest"
```

For desktop builds, set:

```env
VITE_DEFAULT_COORDINATOR_URL="https://your-coordinator.vercel.app"
```

## 4. Deploy

After deployment, test:

- `/api/health`
- `/share/<code>` after creating a share in the desktop app
- The Open In MC Server Share button after installing the desktop app

## Friend Flow

Send friends one URL:

```text
https://your-coordinator.vercel.app/share/<code>
```

They install the app once, click Open In MC Server Share, click Download Latest,
then Host. When they stop, the app uploads the updated world and releases the
host lock.
