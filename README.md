# MC Server Share

MC Server Share lets a group of friends take turns hosting the same Minecraft Java server from their own computers. There is no dedicated server required, and nobody has to port-forward. One person hosts at a time. When they stop, the app uploads the world to the cloud so the next host can continue from the latest save.

- **Website:** https://mc-server-share-app.vercel.app
- **Friend hosting guide:** https://mc-server-share-app.vercel.app/guide
- **Latest app download:** https://github.com/nnicholas-c/mc-server-share-app/releases/latest
- **Current test share:** https://mc-server-share-app.vercel.app/share/8UQLLQ

## What The App Does

The desktop app does the local hosting work:

- Downloads the server package and latest world snapshot.
- Starts the Minecraft Java server on the host's computer.
- Starts the playit.gg agent so friends get a public join address.
- Uploads the world snapshot when the host clicks **Stop and Upload**.

The website/coordinator stores share status, upload permissions, host locks, and private Vercel Blob download links. It does not carry live Minecraft gameplay traffic.

## For Friends: Host From GitHub

Use this when sending the GitHub repo or Releases page to a friend.

1. Open the latest release: https://github.com/nnicholas-c/mc-server-share-app/releases/latest
2. Download the installer for your computer:

| Computer | File |
| --- | --- |
| Windows | `MC.Server.Share_..._x64-setup.exe` |
| Mac Apple Silicon | `MC.Server.Share_..._aarch64.dmg` |
| Mac Intel | `MC.Server.Share_..._x64.dmg` |

3. Install and open **MC Server Share**.
4. Enter your display name.
5. Paste the share code your group is using. For the current test share, use `8UQLLQ`.
6. Click **Load Share**.
7. Install playit.gg once from https://playit.gg/download.
8. In playit.gg, make sure your agent has a **Minecraft Java** tunnel pointing to `127.0.0.1:25565`.
9. In MC Server Share, click **Set playit** and select the playit executable you downloaded.
10. Click **Download & Host**.
11. When the join address appears, post it to Discord.
12. When finished, click **Stop and Upload**.

If the share status says **Server package: Not published yet**, the admin needs to publish the server package before friends can host.

## For Friends: Host From The Website

Use this when sending the website to a friend.

1. Send them the share page, for example: https://mc-server-share-app.vercel.app/share/8UQLLQ
2. They click **Download App** if they have not installed it yet.
3. They click **Open App to Host** from the share page.
4. They set up playit.gg once, if needed.
5. They click **Download & Host** in the app.
6. They share the playit join address with everyone.
7. They click **Stop and Upload** when done.

Friends do not need the admin token. The admin token is only for publishing new server packages, such as changed mods, configs, or server JARs.

## Admin: Publish The Server Package

The admin is the person who created the share and saved the admin token.

1. Open MC Server Share.
2. Click **Import Server** and select the local Minecraft server folder.
3. Click **Create Share**, or load an existing share.
4. Paste the admin token into **Admin token**.
5. Click **Publish Server Package**.

Publishing uploads the server-side files: JARs, mods, configs, scripts, and other server files. World changes are different: they upload automatically every time the host clicks **Stop and Upload**.

Keep the admin token private. If it is lost, create a new share and publish the package again.

## playit.gg Setup

MC Server Share starts the playit agent, but the tunnel itself must exist in your playit.gg account.

1. Download playit from https://playit.gg/download.
2. Run playit once and complete verification/login if prompted.
3. In the playit dashboard, add a **Minecraft Java** tunnel.
4. Set the tunnel target/origin to:
   - Host: `127.0.0.1`
   - Port: `25565`
5. In MC Server Share, click **Set playit** and choose the playit executable.

If playit says **No tunnels configured. Add one at playit.gg**, the app is fine; you just need to add the Minecraft Java tunnel in the playit dashboard.

## Why A Player In China May Be Laggy

MC Server Share is not the live network path for gameplay. Live Minecraft traffic goes:

`player -> playit tunnel server -> host's home computer -> playit tunnel server -> player`

So lag for a player in China is usually caused by one or more of these:

- Long physical distance to the current host.
- Cross-border routing between China and the playit tunnel region.
- The free/global playit tunnel routing to a far datacenter.
- The host using Wi-Fi instead of wired Ethernet.
- The host's upload bandwidth being saturated.
- High Minecraft `view-distance` or `simulation-distance`.
- Heavy modpacks generating or sending lots of chunk data.

Good fixes, in order:

1. Have the person closest to China host the session with **Download & Host**.
2. In playit, test regional tunnels. Try the region closest to the host and, for China-side players, also test an Asia regional tunnel if available.
3. Use wired Ethernet on the host computer.
4. Lower `view-distance` and `simulation-distance` in `server.properties` to around `4` to `6`.
5. Avoid big downloads/uploads on the host's network while playing.
6. Pre-generate chunks or avoid exploring fast with many players.
7. For the best China experience, run the host on a machine or VPS geographically closer to China, such as Hong Kong, Singapore, Japan, or mainland China if accessible.

The app can make hosting easy, but it cannot remove distance, cross-border routing, or home upload limits.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| App is stuck reading or uploading a large package | Use the latest release, then retry. Large server packages can take time, but the app should show progress. |
| Blob upload says public access cannot be used on private store | Install the latest release. New builds upload using private Blob access. |
| playit shows no join address | Make sure a Minecraft Java tunnel exists in playit and points to `127.0.0.1:25565`. |
| Friends cannot connect | Use the exact playit address, including port if shown. Make sure the Minecraft server is still running. |
| Server starts then stops | Check the Logs panel for Java or modpack errors. |
| Minecraft says outdated server/client | The player's Minecraft/modpack version does not match the server. |
| World changes are missing | The last host probably closed the app instead of clicking **Stop and Upload**. |
| Upload fails during Stop and Upload | Click **Stop and Upload** again. Retrying is safe. |

## Developer / Contributor Info

| Folder | What it is |
| --- | --- |
| `apps/desktop` | Tauri + React desktop app |
| `apps/coordinator` | Next.js coordinator on Vercel |
| `packages/protocol` | Shared TypeScript schemas and types |

Requirements: Node.js 24, Rust stable, Java 17+, and platform build tools.

```sh
git clone https://github.com/nnicholas-c/mc-server-share-app.git
cd mc-server-share-app
npm install
```

Create `apps/desktop/.env.local`:

```txt
VITE_DEFAULT_COORDINATOR_URL="https://mc-server-share-app.vercel.app"
```

Run locally:

```sh
npm run dev --workspace @mc-share/desktop
npm run dev --workspace @mc-share/coordinator
```

Push a `vX.Y.Z` tag to build installers through GitHub Actions.
