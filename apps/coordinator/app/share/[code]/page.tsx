import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCoordinator } from "@/runtime";
import { ShareActions } from "./ShareActions";

export default async function SharePage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const manifest = await getCoordinator().getManifest(code).catch(() => null);

  if (!manifest) {
    notFound();
  }

  const requestHeaders = await headers();
  const coordinatorUrl = getCoordinatorUrl(requestHeaders);
  const shareUrl = `${coordinatorUrl}/share/${manifest.code}`;
  const deepLink = `mcservershare://share/${manifest.code}?coordinator=${encodeURIComponent(
    coordinatorUrl
  )}`;
  const desktopDownloadUrl =
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ??
    "https://github.com/nnicholas-c/mc-server-share-app/releases/latest";

  const hostStatus = manifest.activeSession
    ? `Hosted by ${manifest.activeSession.hostDisplayName}`
    : "Ready to host";

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Coordinator">
        <span className="brand">MC Server Share</span>
        <a className="health-link" href="/api/health">
          API health
        </a>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Minecraft Java share</p>
          <h1>{manifest.name}</h1>
          <p className="lead">
            This link has everything a friend needs to join the shared server
            rotation. Open it in the desktop app, download the latest server
            files, then click Host when it is your turn.
          </p>
        </div>

        <aside className="share-card" aria-label="Share actions">
          <span className={`status-pill ${manifest.activeSession ? "status-busy" : "status-ready"}`}>
            {hostStatus}
          </span>
          <div className="share-code">{manifest.code}</div>
          <ShareActions
            deepLink={deepLink}
            desktopDownloadUrl={desktopDownloadUrl}
            shareCode={manifest.code}
            shareUrl={shareUrl}
          />
        </aside>
      </section>

      <section className="below">
        <div className="steps">
          <h2>Fastest Way To Host</h2>
          <ol>
            <li>Install MC Server Share and the playit.gg client once.</li>
            <li>Click Open In MC Server Share from this page.</li>
            <li>In the app, click Download Latest, then Host.</li>
            <li>When finished, click Stop and Upload so the next person gets your world.</li>
          </ol>
        </div>

        <div className="details">
          <h2>Share Status</h2>
          <dl>
            <dt>Port</dt>
            <dd>{manifest.port}</dd>
            <dt>Server package</dt>
            <dd>
              {manifest.currentPackage
                ? `v${manifest.currentPackage.version}`
                : "Not published yet"}
            </dd>
            <dt>Latest world</dt>
            <dd>
              {manifest.latestSnapshot
                ? `v${manifest.latestSnapshot.version}`
                : "Not published yet"}
            </dd>
            <dt>Host lock</dt>
            <dd>{manifest.activeSession ? "Someone is hosting now" : "Available"}</dd>
          </dl>
        </div>
      </section>
    </main>
  );
}

function getCoordinatorUrl(requestHeaders: Headers) {
  const configured =
    process.env.PUBLIC_COORDINATOR_URL?.replace(/\/$/, "") ??
    process.env.PUBLIC_SHARE_BASE_URL?.replace(/\/share\/?$/, "");
  if (configured) {
    return configured;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    return "http://localhost:3000";
  }
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
