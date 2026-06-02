# MC Server Share Hosting Guide

This guide is the short version you can send to friends who need to host the Minecraft server.

- **Website:** https://mc-server-share-app.vercel.app
- **Latest app download:** https://github.com/nnicholas-c/mc-server-share-app/releases/latest
- **Example share page:** https://mc-server-share-app.vercel.app/share/8UQLLQ
- **Example share code:** `8UQLLQ`

Use the share code or share page your group gives you. The `8UQLLQ` code is the current test share from setup.

## Friends: Hosting For The First Time

1. Download MC Server Share from https://github.com/nnicholas-c/mc-server-share-app/releases/latest.
2. Install and open the app.
3. Enter your display name.
4. Paste the share code, such as `8UQLLQ`.
5. Click **Load Share**.
6. Download playit.gg from https://playit.gg/download.
7. Run playit once and verify/login if prompted.
8. In the playit dashboard, create a **Minecraft Java** tunnel to `127.0.0.1:25565`.
9. In MC Server Share, click **Set playit** and select the playit executable.
10. Click **Download & Host**.
11. Wait for the playit join address.
12. Share the join address with everyone.
13. When done, click **Stop and Upload**.

You do not need the admin token to host. You only need the share code and a working playit tunnel.

## Friends: Hosting From The Website

1. Open the share page, for example https://mc-server-share-app.vercel.app/share/8UQLLQ.
2. Click **Download App** if MC Server Share is not installed yet.
3. Click **Open App to Host**.
4. Confirm the share is loaded in the app.
5. Click **Download & Host**.
6. Share the playit address when it appears.
7. Click **Stop and Upload** at the end of the session.

## What Each Button Means

| Button | Who uses it | What it does |
| --- | --- | --- |
| **Load Share** | Everyone | Loads the share code and checks current status. |
| **Download & Host** | Current host | Downloads the latest files, starts Minecraft, starts playit, and locks the share. |
| **Stop and Upload** | Current host | Saves the world, stops hosting, uploads the latest snapshot, and releases the host lock. |
| **Publish Server Package** | Admin only | Uploads server JARs, mods, configs, and scripts after setup or mod changes. |
| **Set playit** | Anyone who hosts | Points the app to the playit executable. |

## Admin: Publishing The Server Package

The admin token is only for the person managing the server files. Friends should not need it.

1. Open MC Server Share.
2. Click **Import Server** and select the Minecraft server folder.
3. Create or load the share.
4. Paste the admin token into **Admin token**.
5. Click **Publish Server Package**.

Publish again only when server-side files change, such as mods, configs, scripts, or the server JAR. Normal world progress uploads automatically through **Stop and Upload**.

## playit.gg Setup

MC Server Share runs the playit agent, but playit.gg still needs a tunnel configured.

1. Go to https://playit.gg.
2. Open your agent.
3. Add a tunnel.
4. Choose **Minecraft Java**.
5. Set the local address to `127.0.0.1`.
6. Set the local port to `25565`.
7. Save it.

If playit says **No tunnels configured**, add the tunnel above. If it shows an address like `q-davidson.gl.joinmc.link`, that is the Minecraft address friends use while the server is running.

## Why China Or Overseas Players May Lag

The website and GitHub release do not carry live gameplay. Live Minecraft traffic goes through playit.gg from each player to the host's computer. A player in China may lag because the current host is far away, because China cross-border routing is slow, because the playit tunnel is routed through a distant datacenter, or because the host's home upload/Wi-Fi is overloaded.

Best fixes:

1. Let the friend closest to China host with **Download & Host**.
2. In playit, test regional tunnels. Try the region closest to the host and test an Asia regional tunnel for China-side players if available.
3. Use wired Ethernet on the host computer.
4. Lower `view-distance` and `simulation-distance` in `server.properties` to `4` to `6`.
5. Avoid streaming, uploads, or downloads on the host network while playing.
6. Pre-generate chunks for heavy modpacks.
7. For the best result, host from a computer or VPS closer to China, such as Hong Kong, Singapore, Japan, or mainland China if accessible.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Share says no server package | The admin must click **Publish Server Package** first. |
| playit has no address | Create a Minecraft Java tunnel to `127.0.0.1:25565`. |
| Friends cannot connect | Use the exact playit address and keep MC Server Share running. |
| Minecraft says outdated client/server | Use the same Minecraft and modpack version as the server. |
| The world did not save | The previous host probably did not click **Stop and Upload**. |
| Upload fails | Click **Stop and Upload** again. |
| China player has high ping | Move hosting closer to China, test playit regional tunnels, lower view distance, and use wired internet. |

## Building From Source

Only developers need this.

```sh
git clone https://github.com/nnicholas-c/mc-server-share-app.git
cd mc-server-share-app
npm install
npm run dev --workspace @mc-share/desktop
```
