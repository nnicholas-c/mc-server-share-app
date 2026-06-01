# MC Server Share — RLCraft / Dregora

A small app that lets a group of friends take turns hosting a Minecraft server without anyone needing a dedicated machine or a paid hosting plan. One person runs the server at a time, and when they're done the world is saved automatically so the next person picks up exactly where things left off.

**Share link:** https://mc-server-share-app.vercel.app/share/XQZPU8

---

## How it works

1. Whoever wants to play types `/host` in Discord — the bot checks if anyone is already hosting and, if not, sends a link.
2. Click the link → the MC Server Share app opens, downloads the latest world automatically, and starts the server.
3. Play. When done, click **Stop and Upload** — the world is saved for the next person.
4. That's it. The next player repeats step 1.

---

## Step 1 — Install the app (everyone, one time)

1. Go to **https://mc-server-share-app.vercel.app**
2. Click **Download App**
3. Run the installer (`MC.Server.Share_…_x64-setup.exe`)
4. If Windows shows a warning, click **More info → Run anyway**

The app only needs to be installed once.

---

## Step 2 — First-time setup (everyone, one time)

Open MC Server Share. You'll see three panels.

1. **Enter your name** in the Display name box — this is what others see when you're hosting.
2. The app automatically connects to the right server (code `XQZPU8`). If it doesn't, type `XQZPU8` in the **Share code** box and click **Load Share**.
3. That's it — the app remembers everything from here on.

---

## Step 3 — Hosting (your turn)

1. Open the app — it loads your settings automatically.
2. Click **Download & Host**.
   - The app downloads the latest world from whoever hosted last (~1–5 min depending on your internet).
   - The Minecraft server starts automatically.
   - playit.gg starts and creates a public address for friends to connect.
3. A join address like `abc123.joinmc.io:12345` appears in the **Logs** panel at the bottom. Share it in Discord.
4. Friends connect in Minecraft using that address.
5. When you're finished, click **Stop and Upload**.
   - The server saves and shuts down cleanly.
   - Your world is uploaded so the next person gets your version.

> **playit.gg:** The first time you host you'll need to download the playit.gg client from https://playit.gg/download, then click **Set playit** in the app and point it to the file you downloaded. The app remembers it after that.

---

## Joining as a player (not hosting)

You don't need to do anything special. Just connect to the Minecraft address the current host posts in Discord. Your Minecraft client version needs to match the server (currently **1.20.4**).

---

## Using Discord

Type `/host` in the Discord server at any time to:
- Check if anyone is currently hosting
- Get a link that opens the app and loads the share automatically if the server is free

---

## Troubleshooting

**"Windows protected your PC" when installing**
→ Click **More info**, then **Run anyway**. The app isn't signed with a paid certificate but it's safe.

**App says "Restoring last session…" and freezes**
→ Check your internet connection and try again. The coordinator might be briefly unavailable.

**Server starts but crashes immediately**
→ Make sure Java is installed. Download it from https://adoptium.net if needed.

**playit shows no address after a minute**
→ Click **Set playit** and make sure you've pointed the app to `playit.exe`. Try again after setting it.

**"Could not find server folder" when importing**
→ Select the folder that contains `server.properties` — not a parent folder and not a subfolder inside it.

**World is behind / missing my changes**
→ The previous host may not have clicked **Stop and Upload**. Either ask them to, or host from your own copy knowing their session won't be saved.

---

## For the server admin

The server package (mods, configs, JARs) only needs to be published once, or when mods change. In the app: load share `XQZPU8`, paste the admin token in the **Admin token** field, then click **Publish Server Package**. Keep the admin token private.

---

<details>
<summary>Developer / contributor info</summary>

### Architecture

| Folder | What it is |
|--------|-----------|
| `apps/desktop` | Tauri + React desktop app (Windows) |
| `apps/coordinator` | Next.js API deployed on Vercel (Neon Postgres + Vercel Blob) |
| `packages/protocol` | Shared TypeScript types |

### Running locally

Requirements: Node.js 24, Rust stable + Visual Studio Build Tools 2022 ("Desktop development with C++"), Java 17+, playit.gg client.

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
# Run the desktop app (compiles Rust on first run, ~3 min)
npm run dev --workspace @mc-share/desktop

# Run the coordinator locally
npm run dev --workspace @mc-share/coordinator
```

### Releases

Push a `vX.Y.Z` tag to trigger a GitHub Actions build that produces the Windows installer automatically.

</details>
