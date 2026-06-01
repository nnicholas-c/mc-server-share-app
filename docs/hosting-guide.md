# How to Host on MC Server Share

Anyone with a Minecraft Java server folder can use this system to share it
with friends. The coordinator is already deployed at
`https://mc-server-share-app.vercel.app`. All you need is the desktop app.

---

## Prerequisites (one-time)

| Tool | Purpose | Where to get it |
|------|---------|----------------|
| **Node.js 24 LTS** | Run the desktop build tools | https://nodejs.org |
| **Rust stable (MSVC)** | Compile the desktop app | https://rustup.rs — accept the default MSVC toolchain |
| **Visual Studio Build Tools 2022** | C++ linker for Rust/Tauri | https://visualstudio.microsoft.com/visual-cpp-build-tools/ — select "Desktop development with C++" |
| **Java 17+** | Run the Minecraft server | Already installed with Minecraft; or https://adoptium.net |
| **playit.gg client** | Expose the server to the internet | https://playit.gg/download |

> **Note on Rust:** rustup will offer to install Visual Studio Build Tools
> automatically. Accept that prompt — it is the easiest path.

---

## First-time setup

```sh
git clone https://github.com/nnicholas-c/mc-server-share-app.git
cd mc-server-share-app
npm install
```

Create `apps/desktop/.env.local`:

```
VITE_DEFAULT_COORDINATOR_URL="https://mc-server-share-app.vercel.app"
```

---

## Running the desktop app

```sh
npm run dev --workspace @mc-share/desktop
```

This compiles the Rust backend (~3 minutes on first run, fast afterward) and
opens the MC Server Share window.

---

## First-time host: publishing the server package

Do this once when you set up a new share. Everyone who joins later will
download the package automatically.

1. Click **Import Server** → select your server folder (e.g. `server1.20.4`).
2. The app auto-detects the server type, port, and start command.
3. In the **Share** panel, set **Coordinator URL** to
   `https://mc-server-share-app.vercel.app` (already the default).
4. Enter a **Display name** (your name) and a **Share name** (e.g. "RLCraft
   Server").
5. Click **Create Share**. Copy the share URL — send it to friends.
6. Paste the admin token somewhere safe (password manager, notes). You need
   it to publish future server updates.
7. Click **Publish Server Package** (enter the admin token when prompted).
   This uploads the mods, configs, and JARs to Vercel Blob (~may take a few
   minutes for large modpacks).

---

## Every time you host

1. Open the app and **Import Server** (or it will remember last time).
2. In the **Share** panel, paste the share code or link and click **Load
   Share**.
3. Click **Download Latest** to get the newest world snapshot from whoever
   hosted before you.
4. Set **playit path** to your `playit.exe` location.
5. Click **Host**. The app starts the Minecraft server and playit.
6. Share the playit address that appears in the Logs panel with your friends.
7. When you're done, click **Stop and Upload**. This saves your world to Vercel
   Blob so the next person picks it up.

---

## Joining (no server folder needed)

Friends who aren't hosting only need the desktop app:

1. Install the app (grab the installer from the
   [Releases page](https://github.com/nnicholas-c/mc-server-share-app/releases/latest)).
2. Open the share link the host sends — it will deep-link into the app
   automatically (`mcservershare://...`), or paste the share code manually.
3. Click **Download Latest** and choose an empty folder to install into.
4. When it's your turn to host, click **Host**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `link.exe not found` when building | Install VS Build Tools 2022 with "Desktop development with C++" |
| `vite` not found when running | Use `npm run dev --workspace @mc-share/desktop` from the repo root, not inside `apps/desktop` |
| Server doesn't start | Check the Logs panel; confirm Java is installed and the start command is correct |
| playit shows no address | Wait ~30 s; check that `playit.exe` path is set correctly in the app |
| Upload fails | Check that Vercel Blob is connected to the coordinator project and `BLOB_READ_WRITE_TOKEN` is set |
| Share page shows old world | The previous host may not have clicked Stop and Upload; wait for them or host from your own copy |
