import { getCoordinator } from "@/runtime";

export default async function SharePage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const manifest = await getCoordinator().getManifest(code);

  return (
    <main style={{ fontFamily: "system-ui", margin: "4rem auto", maxWidth: 760 }}>
      <h1>{manifest.name}</h1>
      <p>Share code: <strong>{manifest.code}</strong></p>
      <p>
        Open MC Server Share, paste this page URL or code into the Share field,
        then click Load Share.
      </p>
      <dl>
        <dt>Port</dt>
        <dd>{manifest.port}</dd>
        <dt>Server package</dt>
        <dd>{manifest.currentPackage ? `v${manifest.currentPackage.version}` : "Not published"}</dd>
        <dt>Latest world</dt>
        <dd>{manifest.latestSnapshot ? `v${manifest.latestSnapshot.version}` : "Not published"}</dd>
      </dl>
    </main>
  );
}
