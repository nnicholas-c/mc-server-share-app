# MC Server Share — RLCraft / Dregora

A tool that lets a group of friends take turns hosting a Minecraft Java server from their own computers, with no dedicated server, no port forwarding, and no technical setup. One person runs the server at a time. When they stop, the world saves automatically to the cloud. The next person downloads it and picks up exactly where things left off.

**Website & share page:** https://mc-server-share-app.vercel.app  
**Current share (RLCraft):** https://mc-server-share-app.vercel.app/share/XQZPU8  
**Discord command:** `/host`  
**Full guide:** https://mc-server-share-app.vercel.app/guide

---

## How it works (the idea)

Every server setup — the mods, configs, and world — lives in the cloud. When it's your turn to host, the app downloads everything to your computer, starts the server, and creates a public address through playit.gg so your friends can connect. When you're done, the world gets uploaded back to the cloud so the next person gets your version.

A **share** is a unique code that ties a group of friends to one server setup. You can have multiple shares for multiple servers (different versions, different modpacks). Each share is independent.

---

## Install the app (everyone, one time)

Go to **https://mc-server-share-app.vercel.app** and click **Download App**.

| Your computer | File to download |
|---------------|-----------------|
| Windows | `MC.Server.Share_…_x64-setup.exe` |
| Mac (M1 / M2 / M3) | `MC.Server.Share_…_aarch64.dmg` |
| Mac (older Intel) | `MC.Server.Share_…_x64.dmg` |

- **Windows:** run the installer. If you see "Windows protected your PC", click **More info → Run anyway**.
- **Mac:** open the `.dmg`, drag the app to Applications. If macOS blocks it, right-click the app → **Open** → **Open**.

---

## First-time setup (everyone, one time)

1. Open MC Server Share.
2. Type your name in **Display name**.
3. Type `XQZPU8` in **Share code** and click **Load Share** (or just click the share link and the app opens with this pre-filled).
4. The app remembers all of this. You won't need to do it again.

**You do not need any server files.** The app downloads the full server — mods, configs, world — from the cloud the first time you host. Friends just install the app and enter their name.

---

## Hosting (your turn)

1. Open the app — everything loads automatically.
2. Set up playit.gg if you haven't yet:
   - Download the client from https://playit.gg/download
   - Click **Set playit** in the app and select the `playit.exe` file you just downloaded
   - The app remembers this path from now on
3. Click **Download & Host**.
   - First time: downloads the server files from the cloud (~1–10 min depending on modpack size and your internet).
   - After the first time: only downloads the latest world, which is much faster.
   - The Minecraft server and playit.gg both start automatically.
4. A join address like `abc123.joinmc.io:12345` appears in the Logs panel. Post it in Discord.
5. Friends connect in Minecraft → **Multiplayer → Add Server** → paste the address.
6. When done playing, click **Stop and Upload**.
   - Saves and shuts down the server cleanly.
   - Uploads the world to the cloud so the next person gets it.

---

## Joining as a player

You don't need to do anything in the app. Just connect to whatever address the current host posts in Discord. Your Minecraft client version must match the server (currently **1.20.4** for RLCraft).

---

## Discord

Type `/host` in the Discord server to:
- See if anyone is currently hosting
- Get a link that opens the app and pre-loads the share automatically

---

## Setting up a new server (different version or modpack)

Each server is its own **share**. To add a new one:

### 1. Prepare the server folder

A Minecraft Java server is just a folder containing:
- A server JAR file (the program that runs Minecraft)
- `server.properties` (port, world name, settings)
- Mods folder (if using Forge/Fabric)
- Any config files

You can get a server JAR from:
- **Vanilla:** https://www.minecraft.net/en-us/download/server
- **Forge (most modpacks):** https://files.minecraftforge.net
- **Fabric:** https://fabricmc.net/use/server/
- **Paper (performance):** https://papermc.io

Run the server JAR once so it generates the default files, accept the EULA, then stop it. Your folder is ready.

### 2. Create a new share

1. Open MC Server Share
2. Click **Import Server** → select your server folder
3. Enter a **Share name** (e.g. "Vanilla 1.21.5" or "Create Mod Server")
4. Click **Create Share**
5. **Save the admin token** that appears — you need it to publish updates. Store it somewhere safe (notes app, password manager).

### 3. Publish the server package

This uploads the mods, configs, and JARs to the cloud so friends can download them.

1. Paste the admin token into the **Admin token** field
2. Click **Publish Server Package**
3. Wait for the upload to finish (larger modpacks take longer)

### 4. Share the link

Send friends the share page URL (shown in the app after creating the share), or give them the share code. They load it in the app and click **Download & Host**.

---

## Using mods

### Adding mods to an existing server

1. Add the mods to your local server folder (both the server-side `mods/` folder and ensure client-side mods are noted for players)
2. Test that the server starts locally
3. Open the app, load the share, enter your admin token
4. Click **Publish Server Package** — this uploads the updated mods to the cloud
5. The next time anyone clicks **Download & Host**, they get the new mods automatically

### Mod types

| Type | Needed on server | Needed on client |
|------|-----------------|-----------------|
| World / game mechanics | Yes | Sometimes |
| Optimization (Sodium, Lithium) | Server version: yes | Client version: separately |
| Client-only (shaders, minimaps) | No | Yes, install manually |

The app publishes server-side files. Players need to install client-only mods in their own Minecraft launcher separately.

### Modpacks

If you're running a CurseForge or Modrinth modpack, download the **server pack** version (not the client pack). It comes ready to run — just accept the EULA and import the folder into the app.

---

## Updating the world (without changing mods)

You don't need to republish the server package just because the world changed — world snapshots are uploaded automatically every time someone clicks **Stop and Upload**. The server package only needs to be republished when mods or configs change.

---

## Troubleshooting

**Windows shows a security warning on install**
→ Click **More info**, then **Run anyway**.

**Mac says the app can't be opened**
→ Right-click the app in Finder → **Open** → **Open** in the dialog. One-time step.

**App stuck on "Restoring last session…"**
→ Check your internet connection. If it persists, close and reopen the app.

**Server crashes immediately after starting**
→ Java may not be installed, or the wrong version is installed. Download Java 17 or newer from https://adoptium.net. Check the Logs panel for the exact error.

**playit.gg doesn't show an address**
→ Wait up to 60 seconds. If nothing appears, make sure playit is set correctly: click **Set playit** and select the file again. Check that playit is allowed through your firewall.

**Friends can't connect**
→ Make sure they're using the exact address from the Logs panel including the port (e.g. `abc.joinmc.io:12345`). Port matters.

**"Outdated server" error in Minecraft**
→ The server version doesn't match the client. Check which Minecraft version the server runs and switch your launcher profile to match.

**Previous host's world changes didn't save**
→ The previous host may have closed the app without clicking **Stop and Upload**. The world reverts to their last save. Nothing lost — it's just their session that's gone.

**Upload fails during Stop and Upload**
→ Internet dropped mid-upload. Click **Stop and Upload** again. It's safe to retry.

---

## For the server admin

You're the admin if you created the share and hold the admin token.

**Publishing a server package** (mods/configs update):
Load the share, paste the admin token, click **Publish Server Package**.

**If you lose the admin token:**
Create a new share. The old share still works for hosting — only publishing new packages requires the token.

**Pinning a package or snapshot:**
Not available in the UI yet. Pinned versions won't be pruned when the retention limit is hit (10 snapshots kept by default).

---

<details>
<summary>Developer / contributor info</summary>

### Architecture

| Folder | What it is |
|--------|-----------|
| `apps/desktop` | Tauri + React desktop app (Windows + Mac) |
| `apps/coordinator` | Next.js API on Vercel (Neon Postgres + Vercel Blob) |
| `packages/protocol` | Shared TypeScript types |

### Running locally

Requirements: Node.js 24, Rust stable + Visual Studio Build Tools 2022 with "Desktop development with C++" (Windows) or Xcode Command Line Tools (Mac), Java 17+.

```sh
git clone https://github.com/nnicholas-c/mc-server-share-app.git
cd mc-server-share-app
npm install
```

Create `apps/desktop/.env.local`:
```
VITE_DEFAULT_COORDINATOR_URL="https://mc-server-share-app.vercel.app"
```

```sh
# Desktop app (compiles Rust ~3 min on first run)
npm run dev --workspace @mc-share/desktop

# Coordinator API
npm run dev --workspace @mc-share/coordinator
```

### Releases

Push a `vX.Y.Z` tag → GitHub Actions builds Windows + Mac installers and publishes a GitHub Release automatically.

</details>
