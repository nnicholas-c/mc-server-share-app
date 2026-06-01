export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", margin: "4rem auto", maxWidth: 760 }}>
      <h1>MC Server Share Coordinator</h1>
      <p>
        This deployment coordinates share manifests, host locks, and Vercel Blob
        upload authorization for the desktop app.
      </p>
      <p>
        Use the desktop app to create or join a share. API health can be checked
        at <code>/api/health</code>.
      </p>
    </main>
  );
}
