import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
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
import { uploadArchive, type LocalArchive, type UploadProgress } from "./lib/upload";

const defaultCoordinatorUrl =
  import.meta.env.VITE_DEFAULT_COORDINATOR_URL ?? "http://localhost:3000";

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
  coordinatorUrl: defaultCoordinatorUrl
};

const joinAddressPatterns = [
  /\b(?:[a-z0-9-]+\.)+(?:joinmc\.(?:link|io)|ply\.gg|playit\.gg)(?::\d+)?\b/i,
  /\b(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b)(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)\b/i
];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function retryUploadFinalization<T>(
  operation: () => Promise<T>,
  onRetry: () => void
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!String(error).includes("No completed upload matches")) {
        throw error;
      }

      onRetry();
      await delay(1000);
    }
  }

  throw lastError;
}

type ProcessLog = {
  process: "minecraft" | "playit";
  line: string;
};

type SavedConfig = {
  serverPath?: string;
  shareCode?: string;
  coordinatorUrl?: string;
  displayName?: string;
  adminToken?: string;
  playitPath?: string;
};

export default function App() {
  const [profile, setProfile] = useState<DesktopProfile>(defaultProfile);
  const [displayName, setDisplayName] = useState("");
  const [shareName, setShareName] = useState("Friends Minecraft World");
  const [shareCode, setShareCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [manifest, setManifest] = useState<ShareManifest | null>(null);
  const [lock, setLock] = useState<ClaimLockResponse | null>(null);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Loading saved settings…");
  const [configLoaded, setConfigLoaded] = useState(false);
  const heartbeatTimer = useRef<number | null>(null);

  const coordinatorUrl = profile.coordinatorUrl ?? "http://localhost:3000";
  const canHost = Boolean(profile.serverPath && manifest && displayName);
  const canDownloadAndHost = Boolean(manifest && displayName);

  function createUploadProgressStatus(label: string) {
    let lastPercent = -1;

    return (progress: UploadProgress) => {
      const percent = Math.max(
        0,
        Math.min(100, Math.round(progress.percentage))
      );

      if (percent !== lastPercent) {
        lastPercent = percent;
        setStatus(
          `${label} ${percent}% (${formatBytes(progress.loaded)} of ${formatBytes(
            progress.total
          )})...`
        );
      }
    };
  }

  useEffect(() => {
    const unlisten = listen<ProcessLog>("process-log", (event) => {
      setLogs((current) => [...current.slice(-300), event.payload]);
    });

    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

  useEffect(() => {
    function openShareLinks(urls: string[] | null) {
      const firstShare = urls
        ?.map(parseShareDeepLink)
        .find((share): share is DeepLinkedShare => Boolean(share));

      if (!firstShare) {
        return;
      }

      setShareCode(firstShare.shareCode);
      if (firstShare.coordinatorUrl) {
        setProfile((current) => ({
          ...current,
          coordinatorUrl: firstShare.coordinatorUrl
        }));
      }
      void loadShare(firstShare.shareCode, firstShare.coordinatorUrl);
    }

    const unlisten = onOpenUrl(openShareLinks);

    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

  // Load persisted config once on startup
  useEffect(() => {
    invoke<SavedConfig>("load_config")
      .then((config) => {
        const savedCoordinatorUrl = config.coordinatorUrl ?? defaultCoordinatorUrl;
        setProfile((current) => ({
          ...current,
          serverPath: config.serverPath ?? current.serverPath,
          coordinatorUrl: savedCoordinatorUrl,
          playitPath: config.playitPath ?? current.playitPath,
        }));
        if (config.displayName) setDisplayName(config.displayName);
        if (config.adminToken) setAdminToken(config.adminToken);
        if (config.shareCode) {
          setShareCode(config.shareCode);
          setStatus("Restoring last session…");
          void loadShare(config.shareCode, savedCoordinatorUrl).finally(() =>
            setConfigLoaded(true)
          );
        } else {
          setStatus("Choose a server folder to begin.");
          setConfigLoaded(true);
        }
      })
      .catch(() => {
        setStatus("Choose a server folder to begin.");
        setConfigLoaded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist config whenever relevant fields change (after initial load)
  useEffect(() => {
    if (!configLoaded) return;
    void invoke("save_config", {
      config: {
        serverPath: profile.serverPath || undefined,
        shareCode: shareCode || undefined,
        coordinatorUrl: profile.coordinatorUrl,
        displayName: displayName || undefined,
        adminToken: adminToken || undefined,
        playitPath: profile.playitPath ?? undefined,
      } satisfies SavedConfig,
    });
  }, [configLoaded, profile.serverPath, profile.coordinatorUrl, profile.playitPath, shareCode, displayName, adminToken]);

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
    for (const entry of [...logs].reverse()) {
      if (entry.process !== "playit") {
        continue;
      }
      for (const pattern of joinAddressPatterns) {
        const match = entry.line.match(pattern);
        if (match) {
          return match[0];
        }
      }
    }
    return "";
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
    await loadShare(shareCode);
  }

  async function loadShare(input: string, coordinatorOverride?: string) {
    setBusy(true);
    try {
      const nextCoordinatorUrl = coordinatorOverride ?? coordinatorUrl;
      const nextManifest = await getManifest(
        nextCoordinatorUrl,
        normalizeShareCode(input)
      );
      setManifest(nextManifest);
      setShareCode(nextManifest.code);
      setShareUrl(`${nextCoordinatorUrl.replace(/\/$/, "")}/share/${nextManifest.code}`);
      setProfile((current) => ({
        ...current,
        coordinatorUrl: nextCoordinatorUrl,
        shareCode: nextManifest.code
      }));
      setStatus(`Loaded share ${nextManifest.code}. Download latest, then click Host.`);
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
      if (!manifest.currentPackage && !manifest.latestSnapshot) {
        setStatus("This share has no published server package or world snapshot yet.");
        return;
      }

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
        const detected = await invoke<DesktopProfile>("detect_server_folder", { serverPath });
        restoreProfile = { ...detected, playitPath: profile.playitPath };
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
        setStatus("Hosting started. Waiting for the playit join address.");
      } else {
        setStatus("Hosting started locally. Set playit to get a public join address.");
      }
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadAndHost() {
    if (!manifest || !displayName) return;
    setBusy(true);
    try {
      // --- download latest ---
      let serverPath = profile.serverPath;
      if (!serverPath && !manifest.currentPackage) {
        setStatus("This share has no server package yet. Publish a server package before friends can host.");
        return;
      }

      if (!serverPath) {
        const selected = await open({ directory: true, multiple: false });
        if (!selected || Array.isArray(selected)) {
          setStatus("Choose an install folder before hosting.");
          return;
        }
        serverPath = selected;
        setProfile((current) => ({ ...current, serverPath }));
      }
      let restoreProfile = { ...profile, serverPath };

      if (manifest.currentPackage) {
        setStatus("Downloading server package…");
        const archive = await invoke<LocalArchive>("download_archive", {
          url: manifest.currentPackage.url,
          expectedSha256: manifest.currentPackage.sha256,
          fileName: `server-${manifest.currentPackage.version}.tar.zst`
        });
        await invoke("extract_server_package", { archivePath: archive.path, destination: serverPath });
        const detected = await invoke<DesktopProfile>("detect_server_folder", { serverPath });
        // Preserve playitPath — detect_server_folder always returns null for it
        restoreProfile = { ...detected, playitPath: profile.playitPath };
        setProfile((current) => ({
          ...restoreProfile,
          coordinatorUrl: current.coordinatorUrl,
          shareCode: manifest.code
        }));
      }

      if (manifest.latestSnapshot) {
        setStatus("Downloading world snapshot…");
        const archive = await invoke<LocalArchive>("download_archive", {
          url: manifest.latestSnapshot.url,
          expectedSha256: manifest.latestSnapshot.sha256,
          fileName: `world-${manifest.latestSnapshot.version}.tar.zst`
        });
        await invoke("restore_world_archive", { profile: restoreProfile, archivePath: archive.path });
      }

      // --- host ---
      setStatus("Starting server…");
      const deviceIdHash = await getDeviceIdHash();
      const nextLock = await claimLock({
        coordinatorUrl,
        shareCode: manifest.code,
        hostDisplayName: displayName,
        deviceIdHash
      });
      setLock(nextLock);
      await invoke("start_minecraft_server", { profile: restoreProfile });
      if (restoreProfile.playitPath) {
        await invoke("start_playit", { playitPath: restoreProfile.playitPath });
        setStatus("Hosting started. Waiting for the playit join address.");
      } else {
        setStatus("Hosting started locally. Set playit to get a public join address.");
      }
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
      setStatus("Stopping Minecraft server and saving world...");
      await invoke("stop_minecraft_server");
      setStatus("Stopping playit...");
      await invoke("stop_playit");
      setStatus("Creating world archive...");
      const archive = await invoke<LocalArchive>("create_world_archive", { profile });
      setStatus(`Preparing world archive upload (${formatBytes(archive.size)})...`);
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
        },
        onUploadProgress: createUploadProgressStatus("Uploading world archive")
      });

      setStatus("Finalizing uploaded world snapshot...");
      await retryUploadFinalization(
        () =>
          completeSession({
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
          }),
        () => setStatus("Finalizing uploaded world snapshot...")
      );

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
      setStatus("Creating server package archive...");
      const archive = await invoke<LocalArchive>("create_server_archive", { profile });
      setStatus(`Preparing server package upload (${formatBytes(archive.size)})...`);
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
        },
        onUploadProgress: createUploadProgressStatus("Uploading server package")
      });

      setStatus("Finalizing server package...");
      await retryUploadFinalization(
        () =>
          publishPackage({
            coordinatorUrl,
            shareCode: manifest.code,
            request: {
              adminToken,
              blobUrl: blob.url,
              sha256: archive.sha256,
              size: archive.size,
              archiveFormat: archive.archiveFormat
            }
          }),
        () => setStatus("Finalizing server package...")
      );

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
          <button disabled={busy || !manifest} onClick={handleDownloadLatest}>
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
          {!joinAddress && lock ? (
            <p className="hint">
              If this stays here, check the Logs section for playit output and make sure playit has a Minecraft tunnel to port {profile.serverPort}.
            </p>
          ) : null}
          {!lock ? (
            <>
              <button className="primary" disabled={busy || !canDownloadAndHost} onClick={handleDownloadAndHost}>
                Download &amp; Host
              </button>
              <button className="quiet" disabled={busy || !canHost} onClick={handleHost}>
                Host (skip download)
              </button>
            </>
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

type DeepLinkedShare = {
  shareCode: string;
  coordinatorUrl?: string;
};

function normalizeShareCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed.includes("/")) {
    return trimmed;
  }
  return trimmed.split("/").filter(Boolean).at(-1) ?? trimmed;
}

function parseShareDeepLink(value: string): DeepLinkedShare | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "mcservershare:") {
      return null;
    }

    const shareCode =
      url.searchParams.get("code") ??
      (url.hostname === "share" ? url.pathname.split("/").filter(Boolean)[0] : "") ??
      "";

    if (!shareCode) {
      return null;
    }

    return {
      shareCode: normalizeShareCode(shareCode),
      coordinatorUrl: url.searchParams.get("coordinator") ?? undefined
    };
  } catch {
    return null;
  }
}
