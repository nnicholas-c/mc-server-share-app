export default function Home() {
  const desktopDownloadUrl =
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ??
    "https://github.com/nnicholas-c/mc-server-share-app/releases/latest";

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Coordinator">
        <span className="brand">MC Server Share</span>
        <a className="health-link" href="/api/health">
          API health
        </a>
      </nav>

      <section className="hero-copy home-panel">
        <p className="eyebrow">Coordinator online</p>
        <h1>Host a Minecraft server with friends.</h1>
        <p className="lead">
          This web app stores share status, host locks, and upload permissions.
          The desktop app does the local work: it starts Java, runs playit.gg,
          downloads the latest world, and uploads the world when hosting stops.
        </p>
        <div className="home-actions">
          <a className="button primary" href={desktopDownloadUrl}>
            Download App
          </a>
          <a className="button secondary" href="https://github.com/nnicholas-c/mc-server-share-app/blob/main/docs/hosting-guide.md">
            How to Host
          </a>
        </div>
      </section>
    </main>
  );
}
