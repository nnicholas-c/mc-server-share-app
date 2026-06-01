# Hosting Guide — RLCraft / Dregora Server

**Share URL:** https://mc-server-share-app.vercel.app/share/XQZPU8  
**Share code:** `XQZPU8`  
**Discord command:** `/host`

---

## Getting the app

Download the installer from the [Releases page](https://github.com/nnicholas-c/mc-server-share-app/releases/latest) and run it. No dev tools, no Git, no Rust — just install and open.

> If the Releases page says "no releases" it means the Windows build is still compiling (first build takes ~20 min on GitHub Actions). Check back soon or build from source (see [Contributing](#contributing)).

---

## First time: 3-step setup

1. **Open the app** — it will say "Loading saved settings…"
2. **Import your server folder** — click **Import Server**, select the folder containing your Minecraft server (e.g. the folder with `forge-…jar` and `server.properties`)
3. **Enter your display name** — type your name in the Display name box (this is what others see when you're hosting)

The app saves everything automatically. Next time you open it, your folder, name, and share are all pre-loaded.

---

## Hosting (every session)

1. Open the app — it auto-loads the share. If it doesn't, paste `XQZPU8` in the **Share code** field and click **Load Share**.
2. Click **Download & Host**
   - Downloads the latest world snapshot from whoever hosted last
   - Starts the Minecraft server
   - Starts playit.gg (if you've set the path — see below)
3. Wait for a `your-address.joinmc.io:PORT` address to appear in the **Logs** panel
4. Share that address in Discord so your friends can connect in Minecraft
5. When done playing, click **Stop and Upload** — this saves your world so the next person gets it

**Setting up playit.gg (one-time):**
- Download the client from https://playit.gg/download
- In the app, click **Set playit** and select the `playit.exe` file
- The app remembers the path from then on

---

## Friends: joining and hosting

Anyone can download the installer and be ready to host in under 5 minutes.

**To download and join for the first time:**
1. Get the installer from [Releases](https://github.com/nnicholas-c/mc-server-share-app/releases/latest)
2. Open the app and paste the share code `XQZPU8`, or click this link: [Open in MC Server Share](mcservershare://share/XQZPU8?coordinator=https://mc-server-share-app.vercel.app)
3. Enter your display name
4. Click **Download & Host** — the app fetches everything (mods, world) and starts the server automatically
5. Share the playit address in Discord

**Using Discord:**
- Type `/host` in the server
- If the server is free, you'll get a link that opens the app directly
- If someone is already hosting, you'll see their name

---

## Admin tasks (first-time server publish)

This only needs to happen once, or whenever the mods/config change. You need the **admin token** for the share.

1. Open the app, load share `XQZPU8`
2. Paste the admin token in the **Admin token** field
3. Click **Publish Server Package**
   - This uploads all mods, JARs, and configs to Vercel Blob
   - Friends will download this package the first time they click Download & Host
   - Large modpacks (1–2 GB) may take a few minutes

> **Keep the admin token safe.** It controls who can publish new server packages. Don't share it publicly.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App shows "Restoring last session…" and hangs | Check internet connection; coordinator might be briefly unavailable |
| "Could not find server folder" | Make sure you selected the folder that contains `server.properties` |
| Server starts but crashes immediately | Check the Logs panel for the Java error; confirm Java 17+ is installed |
| playit shows no address after 60 s | Make sure the playit path is set correctly; try re-clicking Set playit |
| "Share not found" | Double-check you typed `XQZPU8` exactly; no spaces |
| Minecraft shows "outdated server" | The server is running a different Minecraft version than your client |
| Upload fails at Stop and Upload | Rare network error — click Stop and Upload again |
| World didn't save | If the app crashed without clicking Stop and Upload, the world is local only — the next host won't have your changes |

---

## Contributing / building from source

Only needed if you want to modify the app or the release build isn't available yet.

**Prerequisites:**
- Node.js 24 LTS — https://nodejs.org
- Rust stable + Visual Studio Build Tools 2022 with "Desktop development with C++" — run `rustup-init.exe` from https://rustup.rs and accept the prompt to install VS Build Tools
- Java 17+ for running the Minecraft server
- playit.gg client — https://playit.gg/download

```sh
git clone https://github.com/nnicholas-c/mc-server-share-app.git
cd mc-server-share-app
npm install
```

Create `apps/desktop/.env.local`:
```
VITE_DEFAULT_COORDINATOR_URL="https://mc-server-share-app.vercel.app"
```

Run the app:
```sh
npm run dev --workspace @mc-share/desktop
```

First compile takes ~3 minutes. After that, hot-reload is near-instant.
