const CURRENT_SHARE_CODE = "NTKPTG";
const CURRENT_SHARE_URL = `/share/${CURRENT_SHARE_CODE}`;
const DOWNLOAD_URL = "https://github.com/nnicholas-c/mc-server-share-app/releases/latest";
const PLAYIT_DOWNLOAD = "https://playit.gg/download";
const PLAYIT_PING = "http://ping.gl.ply.gg";
const JAVA_DOWNLOAD = "https://adoptium.net";
const FORGE_DOWNLOAD = "https://files.minecraftforge.net";
const FABRIC_DOWNLOAD = "https://fabricmc.net/use/server/";
const PAPER_DOWNLOAD = "https://papermc.io";
const VANILLA_DOWNLOAD = "https://www.minecraft.net/en-us/download/server";

export const metadata = {
  title: "Guide - MC Server Share",
  description: "How friends install, host, troubleshoot, and reduce lag with MC Server Share."
};

export default function GuidePage() {
  return (
    <main className="page-shell">
      <nav className="topbar">
        <a className="brand" href="/">MC Server Share</a>
        <a className="health-link" href={CURRENT_SHARE_URL}>Share page</a>
      </nav>

      <div className="guide">
        <section className="guide-intro">
          <p className="eyebrow">Friend hosting guide</p>
          <h1>Host the Minecraft server from GitHub or the website.</h1>
          <p className="lead">
            MC Server Share lets friends take turns hosting the same Minecraft Java server.
            Install the desktop app, load the share, start playit.gg, click Download &amp; Host,
            then click Stop and Upload when the session ends.
          </p>
        </section>

        <nav className="guide-toc">
          <p className="guide-toc-label">On this page</p>
          <ol>
            <li><a href="#github">1. Host from GitHub</a></li>
            <li><a href="#website">2. Host from the website</a></li>
            <li><a href="#playit">3. Set up playit.gg</a></li>
            <li><a href="#buttons">4. What the buttons mean</a></li>
            <li><a href="#admin">5. Admin publishing</a></li>
            <li><a href="#joining">6. Joining as a player</a></li>
            <li><a href="#new-server">7. Create a new share</a></li>
            <li><a href="#mods">8. Mods and modpacks</a></li>
            <li><a href="#latency">9. Lag for China or overseas players</a></li>
            <li><a href="#troubleshooting">10. Troubleshooting</a></li>
          </ol>
        </nav>

        <section className="guide-section" id="github">
          <h2>1. Host from GitHub</h2>
          <p>Use this flow when someone sends you the GitHub repo or Releases page.</p>

          <ol className="guide-steps">
            <li>Open the latest release: <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer">GitHub Releases</a></li>
            <li>Download the installer for your computer.</li>
            <li>Install and open <strong>MC Server Share</strong>.</li>
            <li>Enter your <strong>Display name</strong>.</li>
            <li>Paste your group&apos;s share code. For the current published share, use <code>{CURRENT_SHARE_CODE}</code>.</li>
            <li>Click <strong>Load Share</strong>.</li>
            <li>Set up playit.gg once, then click <strong>Set playit</strong> in the app.</li>
            <li>Click <strong>Download &amp; Host</strong>.</li>
            <li>Post the playit join address in Discord when it appears.</li>
            <li>When finished, click <strong>Stop and Upload</strong>.</li>
          </ol>

          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Computer</th><th>File to download</th></tr>
              </thead>
              <tbody>
                <tr><td>Windows</td><td><code>MC.Server.Share_..._x64-setup.exe</code></td></tr>
                <tr><td>Mac - Apple Silicon</td><td><code>MC.Server.Share_..._aarch64.dmg</code></td></tr>
                <tr><td>Mac - Intel</td><td><code>MC.Server.Share_..._x64.dmg</code></td></tr>
              </tbody>
            </table>
          </div>

          <a className="button primary guide-cta" href={DOWNLOAD_URL} target="_blank" rel="noreferrer">
            Download App
          </a>
        </section>

        <section className="guide-section" id="website">
          <h2>2. Host from the website</h2>
          <p>Use this flow when someone sends you the share page.</p>

          <ol className="guide-steps">
            <li>Open the share page, for example <a href={CURRENT_SHARE_URL}>{CURRENT_SHARE_URL}</a>.</li>
            <li>Click <strong>Download App</strong> if the app is not installed yet.</li>
            <li>Click <strong>Open App to Host</strong>.</li>
            <li>Confirm the share loaded in MC Server Share.</li>
            <li>Click <strong>Download &amp; Host</strong>.</li>
            <li>Share the playit address with everyone.</li>
            <li>Click <strong>Stop and Upload</strong> at the end of the session.</li>
          </ol>

          <div className="guide-callout guide-callout-info">
            <strong>Friends do not need the admin token.</strong> They only need the app,
            the share code or share page, and a working playit tunnel.
          </div>
        </section>

        <section className="guide-section" id="playit">
          <h2>3. Set up playit.gg</h2>
          <p>
            MC Server Share starts the playit agent, but playit.gg still needs a Minecraft tunnel
            configured in the host&apos;s playit account.
          </p>

          <ol className="guide-steps">
            <li>Download playit from <a href={PLAYIT_DOWNLOAD} target="_blank" rel="noreferrer">playit.gg/download</a>.</li>
            <li>Run playit once and complete verification or login if prompted.</li>
            <li>Open the playit dashboard and add a tunnel.</li>
            <li>Choose <strong>Minecraft Java</strong>.</li>
            <li>Set the local address to <code>127.0.0.1</code>.</li>
            <li>Set the local port to <code>25565</code>.</li>
            <li>Save the tunnel.</li>
            <li>In MC Server Share, click <strong>Set playit</strong> and select the playit executable.</li>
          </ol>

          <div className="guide-callout guide-callout-warn">
            <strong>No tunnels configured?</strong> Add the Minecraft Java tunnel in playit.gg.
            If playit shows an address like <code>q-davidson.gl.joinmc.link</code>, that is the address
            friends use while the server is running.
          </div>
        </section>

        <section className="guide-section" id="buttons">
          <h2>4. What the buttons mean</h2>
          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Button</th><th>Who uses it</th><th>What it does</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Load Share</strong></td>
                  <td>Everyone</td>
                  <td>Loads the share code and checks status.</td>
                </tr>
                <tr>
                  <td><strong>Download &amp; Host</strong></td>
                  <td>Current host</td>
                  <td>Downloads files, starts Minecraft, starts playit, and locks the share.</td>
                </tr>
                <tr>
                  <td><strong>Stop and Upload</strong></td>
                  <td>Current host</td>
                  <td>Saves the world, uploads the latest snapshot, and releases the lock.</td>
                </tr>
                <tr>
                  <td><strong>Publish Server Package</strong></td>
                  <td>Admin only</td>
                  <td>Uploads server JARs, mods, configs, and scripts after setup or mod changes.</td>
                </tr>
                <tr>
                  <td><strong>Set playit</strong></td>
                  <td>Anyone who hosts</td>
                  <td>Points the app to the playit executable.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="guide-section" id="admin">
          <h2>5. Admin publishing</h2>
          <p>
            The admin token is only for the person managing server files. Publish the server package
            once before friends host, and publish again only when server-side files change.
          </p>

          <ol className="guide-steps">
            <li>Open MC Server Share.</li>
            <li>Click <strong>Import Server</strong> and select the Minecraft server folder.</li>
            <li>Create or load the share.</li>
            <li>Paste the admin token into <strong>Admin token</strong>.</li>
            <li>Click <strong>Publish Server Package</strong>.</li>
          </ol>

          <div className="guide-callout guide-callout-info">
            Normal world progress uploads automatically through <strong>Stop and Upload</strong>.
            You do not need to publish the server package just because players made progress.
          </div>
        </section>

        <section className="guide-section" id="joining">
          <h2>6. Joining as a player</h2>
          <p>
            If someone else is hosting and you just want to play, open Minecraft, go to
            <strong> Multiplayer</strong>, add a server, and paste the playit address the host posts.
            The app is only needed if you want to take a turn hosting.
          </p>
          <p>
            Your Minecraft and modpack versions must match the server. If you get an outdated
            client/server message, switch launcher profiles or update the modpack.
          </p>
        </section>

        <section className="guide-section" id="new-server">
          <h2>7. Create a new share</h2>
          <p>
            Each Minecraft version or modpack should have its own share. Shares are independent,
            so one group can keep multiple servers without mixing worlds.
          </p>

          <ol className="guide-steps">
            <li>Prepare a Minecraft Java server folder with <code>server.properties</code> and a server JAR.</li>
            <li>Run the server once, accept the EULA, then stop it.</li>
            <li>Open MC Server Share and click <strong>Import Server</strong>.</li>
            <li>Enter a share name and click <strong>Create Share</strong>.</li>
            <li>Save the admin token somewhere private.</li>
            <li>Click <strong>Publish Server Package</strong>.</li>
            <li>Send friends the share page or share code.</li>
          </ol>

          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Server type</th><th>Use case</th><th>Download</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vanilla</td>
                  <td>Plain Minecraft</td>
                  <td><a href={VANILLA_DOWNLOAD} target="_blank" rel="noreferrer">minecraft.net</a></td>
                </tr>
                <tr>
                  <td>Forge</td>
                  <td>Most modpacks</td>
                  <td><a href={FORGE_DOWNLOAD} target="_blank" rel="noreferrer">files.minecraftforge.net</a></td>
                </tr>
                <tr>
                  <td>Fabric</td>
                  <td>Lighter modpacks and performance mods</td>
                  <td><a href={FABRIC_DOWNLOAD} target="_blank" rel="noreferrer">fabricmc.net</a></td>
                </tr>
                <tr>
                  <td>Paper</td>
                  <td>Vanilla with plugins and better performance</td>
                  <td><a href={PAPER_DOWNLOAD} target="_blank" rel="noreferrer">papermc.io</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="guide-section" id="mods">
          <h2>8. Mods and modpacks</h2>
          <p>
            MC Server Share publishes server-side files. Players still need the matching client-side
            modpack in their Minecraft launcher.
          </p>

          <ul className="guide-list">
            <li>Download the server pack version of a modpack, not only the client pack.</li>
            <li>Test the server locally before publishing a package.</li>
            <li>Tell friends when you update mods, because their client modpack may need updating too.</li>
            <li>Use <a href={JAVA_DOWNLOAD} target="_blank" rel="noreferrer">Java 17+</a> for modern Minecraft versions.</li>
          </ul>
        </section>

        <section className="guide-section" id="latency">
          <h2>9. Lag for China or overseas players</h2>
          <p>
            The website and GitHub release do not carry live gameplay. Minecraft traffic goes through
            playit.gg between each player and the current host&apos;s computer.
          </p>

          <div className="guide-callout guide-callout-info">
            <strong>Traffic path:</strong> player - playit tunnel server - host&apos;s computer - playit tunnel server - player.
          </div>

          <p>For a player in China, lag is usually caused by distance, cross-border routing, playit datacenter choice, host Wi-Fi, home upload limits, high view distance, or heavy modpacks.</p>

          <h3>Best fixes</h3>
          <ol className="guide-steps">
            <li>Let the friend closest to China host with <strong>Download &amp; Host</strong>.</li>
            <li>In playit, test regional tunnels. Try the region closest to the host and test an Asia regional tunnel for China-side players if available.</li>
            <li>Ask the high-ping player to test <a href={PLAYIT_PING} target="_blank" rel="noreferrer">ping.gl.ply.gg</a> and note the datacenter they reach.</li>
            <li>Use wired Ethernet on the host computer.</li>
            <li>Lower <code>view-distance</code> and <code>simulation-distance</code> in <code>server.properties</code> to around <code>4</code> to <code>6</code>.</li>
            <li>Avoid streaming, downloads, or uploads on the host network while playing.</li>
            <li>For the best result, host from a computer or VPS closer to China, such as Hong Kong, Singapore, Japan, or mainland China if accessible.</li>
          </ol>

          <div className="guide-callout guide-callout-warn">
            The app can make hosting easy, but it cannot remove distance, cross-border routing,
            or the upload limits of the host&apos;s home internet.
          </div>
        </section>

        <section className="guide-section" id="troubleshooting">
          <h2>10. Troubleshooting</h2>

          <div className="guide-faq">
            <div className="guide-faq-item">
              <p className="guide-faq-q">Share says no server package</p>
              <p>The admin must click <strong>Publish Server Package</strong> before friends can host.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">playit has no address</p>
              <p>Create a Minecraft Java tunnel to <code>127.0.0.1:25565</code>, then restart hosting.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Friends cannot connect</p>
              <p>Use the exact playit address, including the port if one is shown, and keep the host app running.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Minecraft says outdated client or server</p>
              <p>The player&apos;s Minecraft or modpack version does not match the server.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">World progress is missing</p>
              <p>The previous host probably closed the app instead of clicking <strong>Stop and Upload</strong>.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Upload fails</p>
              <p>Click <strong>Stop and Upload</strong> again. Retrying is safe.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">China player has high ping</p>
              <p>Move hosting closer to China, test playit regional tunnels, lower view distance, and use wired internet.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
