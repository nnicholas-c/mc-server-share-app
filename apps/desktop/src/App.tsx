import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  ClaimLockResponse,
  DesktopProfile,
  ShareManifest
} from "@mc-share/protocol";
import {
  claimLock,
  completeSession,
  createShare,
  getManifest,
  heartbeat,
  publishPackage
} from "./lib/api";
import { getDeviceIdHash } from "./lib/device";
import { uploadArchive, type LocalArchive } from "./lib/upload";

const defaultProfile: DesktopProfile = {
  serverPath: "",
  serverType: "unknown",
  startCommand: "java -jar server.jar nogui",
  javaPath: "java",
  memoryMb: 4096,
  serverPort: 25565,
  levelName: "world",
  worldIncludes: ["world"],
  worldExcludes: ["session.lock", "logs", "crash-reports"],
  coordinatorUrl: "http://localhost:3000"
};

type ProcessLog = {
  process: "minecraft" | "playit";
  line: string;
};

export default function App() {
  const [profile, setProfile] = useState<DesktopProfile>(defaultProfile);
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("mc-share-display-name") ?? ""
  );
  const [shareName, setShareName] = useState("Friends Minecraft World");
  const [shareCode, setShareCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [manifest, setManifest] = useState<ShareManifest | null>(null);
  const [lock, setLock] = useState<ClaimLockResponse | null>(null);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a server folder to begin.");
  const heartbeatTimer = useRef<number | null>(null);

  const coordinatorUrl = profile.coordinatorUrl ?? "http://localhost:3000";
  const canHost = Boolean(profile.serverPath && manifest && displayName);

  useEffect(() => {
    const unlisten = listen<ProcessLog>("process-log", (event) => {
      setLogs((current) => [...current.slice(-300), event.payload]);
    });

    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("mc-share-display-name", displayName);
  }, [displayName]);

  useEffect(() => {
    if (!lock) {
      if (heartbeatTimer.current) {
        window.clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
      return;
    }

    heartbeatTimer.current = window.setInterval(() => {
      void heartbeat({
        coordinatorUrl,
        sessionId: lock.session.id,
        lockToken: lock.lockToken
      }).catch((error) => setStatus(error.message));
    }, 60_000);

    return () => {
      if (heartbeatTimer.current) {
        window.clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
    };
  }, [coordinatorUrl, lock]);

  const joinAddress = useMemo(() => {
    const line = [...logs]
      .reverse()
      .find((entry) => entry.process === "playit" && /[a-z0-9.-]+:\d+/i.test(entry.line));
    return line?.line.match(/[a-z0-9.-]+:\d+/i)?.[0] ?? "";
  }, [logs]);

  async function chooseServerFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    setBusy(true);
    try {
      const detected = await invoke<DesktopProfile>("detect_server_folder", {
        serverPath: selected
      });
      setProfile({ ...detected, coordinatorUrl });
      setStatus("Server folder imported. Review settings, then create or join a share.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function choosePlayitBinary() {
    const selected = await open({ directory: false, multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }
    setProfile((current) => ({ ...current, playitPath: selected }));
  }

  async function handleCreateShare() {
    setBusy(true);
    try {
      const result = await createShare(profile, shareName, coordinatorUrl);
      setManifest(result.manifest);
      setShareCode(result.manifest.code);
      setShareUrl(result.shareUrl ?? "");
      setAdminToken(result.adminToken);
      setProfile((current) => ({ ...current, shareCode: result.manifest.code }));
      setStatus(`Share created: ${result.manifest.code}. Store the admin token safely.`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadShare() {
    setBusy(true);
    try {
      const nextManifest = await getManifest(coordinatorUrl, normalizeShareCode(shareCode));
      setManifest(nextManifest);
      setShareCode(nextManifest.code);
      setShareUrl(`${coordinatorUrl.replace(/\/$/, "")}/share/${nextManifest.code}`);
      setProfile((current) => ({ ...current, shareCode: nextManifest.code }));
      setStatus(`Loaded share ${nextManifest.code}.`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadLatest() {
    if (!manifest) {
      return;
    }
    setBusy(true);
    try {
      let serverPath = profile.serverPath;
      if (!serverPath) {
        const selected = await open({ directory: true, multiple: false });
        if (!selected || Array.isArray(selected)) {
          setStatus("Choose an install folder before downloading the share.");
          return;
        }
        serverPath = selected;
        setProfile((current) => ({ ...current, serverPath }));
      }
      let restoreProfile = { ...profile, serverPath };

      if (manifest.currentPackage) {
        const archive = await invoke<LocalArchive>("download_archive", {
          url: manifest.currentPackage.url,
          expectedSha256: manifest.currentPackage.sha256,
          fileName: `server-${manifest.currentPackage.version}.tar.zst`
        });
        await invoke("extract_server_package", {
          archivePath: archive.path,
          destination: serverPath
        });
        restoreProfile = await invoke<DesktopProfile>("detect_server_folder", {
          serverPath
        });
        setProfile((current) => ({
          ...restoreProfile,
          coordinatorUrl: current.coordinatorUrl,
          shareCode: manifest.code
        }));
      }

      if (manifest.latestSnapshot) {
        const archive = await invoke<LocalArchive>("download_archive", {
          url: manifest.latestSnapshot.url,
          expectedSha256: manifest.latestSnapshot.sha256,
          fileName: `world-${manifest.latestSnapshot.version}.tar.zst`
        });
        await invoke("restore_world_archive", {
          profile: restoreProfile,
          archivePath: archive.path
        });
      }

      setStatus("Latest package and world snapshot restored.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleHost() {
    if (!manifest || !canHost) {
      return;
    }

    setBusy(true);
    try {
      const deviceIdHash = await getDeviceIdHash();
      const nextLock = await claimLock({
        coordinatorUrl,
        shareCode: manifest.code,
        hostDisplayName: displayName,
        deviceIdHash
      });
      setLock(nextLock);

      await invoke("start_minecraft_server", { profile });
      if (profile.playitPath) {
        await invoke("start_playit", { playitPath: profile.playitPath });
      }
      setStatus("Hosting started. Share the playit address when it appears.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleStopAndUpload() {
    if (!manifest || !lock) {
      return;
    }

    setBusy(true);
    try {
      await invoke("stop_minecraft_server");
      await invoke("stop_playit");
      const archive = await invoke<LocalArchive>("create_world_archive", { profile });
      const blob = await uploadArchive({
        archive,
        coordinatorUrl,
        endpoint: "/api/uploads/world-token",
        clientPayload: {
          uploadType: "world",
          shareCode: manifest.code,
          sessionId: lock.session.id,
          lockToken: lock.lockToken,
          expectedSha256: archive.sha256,
          size: archive.size,
          archiveFormat: archive.archiveFormat
        }
      });

      await completeSession({
        coordinatorUrl,
        sessionId: lock.session.id,
        request: {
          lockToken: lock.lockToken,
          blobUrl: blob.url,
          sha256: archive.sha256,
          size: archive.size,
          archiveFormat: archive.archiveFormat,
          hostDisplayName: displayName
        }
      });

      setLock(null);
      setManifest(await getManifest(coordinatorUrl, manifest.code));
      setStatus("World snapshot uploaded and host lock released.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishPackage() {
    if (!manifest || !adminToken) {
      setStatus("Enter the share admin token before publishing a package.");
      return;
    }

    setBusy(true);
    try {
      const archive = await invoke<LocalArchive>("create_server_archive", { profile });
      const blob = await uploadArchive({
        archive,
        coordinatorUrl,
        endpoint: "/api/uploads/package-token",
        clientPayload: {
          uploadType: "package",
          shareCode: manifest.code,
          adminToken,
          expectedSha256: archive.sha256,
          size: archive.size,
          archiveFormat: archive.archiveFormat
        }
      });

      await publishPackage({
        coordinatorUrl,
        shareCode: manifest.code,
        request: {
          adminToken,
          blobUrl: blob.url,
          sha256: archive.sha256,
          size: archive.size,
          archiveFormat: archive.archiveFormat
        }
      });

      setManifest(await getManifest(coordinatorUrl, manifest.code));
      setStatus("Server package published.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <h1>MC Server Share</h1>
          <p>{status}</p>
        </div>
        <div className="toolbar-actions">
          <button disabled={busy} onClick={chooseServerFolder}>
            Import Server
          </button>
          <button disabled={busy} onClick={choosePlayitBinary}>
            Set playit
          </button>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Local Server</h2>
          <label>
            Server folder
            <input
              value={profile.serverPath}
              onChange={(event) =>
                setProfile((current) => ({ ...current, serverPath: event.target.value }))
              }
            />
          </label>
          <div className="split">
            <label>
              Type
              <input value={profile.serverType} readOnly />
            </label>
            <label>
              Port
              <input
                type="number"
                value={profile.serverPort}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    serverPort: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>
          <label>
            Start command
            <input
              value={profile.startCommand}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  startCommand: event.target.value
                }))
              }
            />
          </label>
          <div className="split">
            <label>
              Java
              <input
                value={profile.javaPath}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, javaPath: event.target.value }))
                }
              />
            </label>
            <label>
              Memory MB
              <input
                type="number"
                value={profile.memoryMb}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    memoryMb: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>
          <label>
            World folders
            <input
              value={profile.worldIncludes.join(", ")}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  worldIncludes: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                }))
              }
            />
          </label>
        </div>

        <div className="panel">
          <h2>Share</h2>
          <label>
            Coordinator URL
            <input
              value={coordinatorUrl}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  coordinatorUrl: event.target.value
                }))
              }
            />
          </label>
          <label>
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label>
            Share name
            <input value={shareName} onChange={(event) => setShareName(event.target.value)} />
          </label>
          <button disabled={busy || !profile.serverPath} onClick={handleCreateShare}>
            Create Share
          </button>
          <label>
            Share code or link
            <input value={shareCode} onChange={(event) => setShareCode(event.target.value)} />
          </label>
          <button disabled={busy || !shareCode} onClick={handleLoadShare}>
            Load Share
          </button>
          <label>
            Admin token
            <input
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              type="password"
            />
          </label>
          <label>
            Share link
            <input value={shareUrl} readOnly />
          </label>
          <button disabled={busy || !manifest || !profile.serverPath} onClick={handleDownloadLatest}>
            Download Latest
          </button>
          <button disabled={busy || !manifest || !adminToken} onClick={handlePublishPackage}>
            Publish Server Package
          </button>
        </div>

        <div className="panel host-panel">
          <h2>Host</h2>
          <dl>
            <div>
              <dt>Share</dt>
              <dd>{manifest?.code ?? "None"}</dd>
            </div>
            <div>
              <dt>Latest world</dt>
              <dd>{manifest?.latestSnapshot?.version ?? "No snapshot"}</dd>
            </div>
            <div>
              <dt>Join address</dt>
              <dd>{joinAddress || "Waiting for playit"}</dd>
            </div>
          </dl>
          {!lock ? (
            <button disabled={busy || !canHost} onClick={handleHost}>
              Host
            </button>
          ) : (
            <button disabled={busy} onClick={handleStopAndUpload}>
              Stop and Upload
            </button>
          )}
        </div>
      </section>

      <section className="logs">
        <h2>Logs</h2>
        <pre>
          {logs.map((entry, index) => `[${entry.process}] ${entry.line}`).join("\n")}
        </pre>
      </section>
    </main>
  );
}

function normalizeShareCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed.includes("/")) {
    return trimmed;
  }
  return trimmed.split("/").filter(Boolean).at(-1) ?? trimmed;
}
