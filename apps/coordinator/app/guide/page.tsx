const WIN_DOWNLOAD = "https://github.com/nnicholas-c/mc-server-share-app/releases/latest";
const PLAYIT_DOWNLOAD = "https://playit.gg/download";
const JAVA_DOWNLOAD = "https://adoptium.net";
const FORGE_DOWNLOAD = "https://files.minecraftforge.net";
const FABRIC_DOWNLOAD = "https://fabricmc.net/use/server/";
const PAPER_DOWNLOAD = "https://papermc.io";
const VANILLA_DOWNLOAD = "https://www.minecraft.net/en-us/download/server";

export const metadata = {
  title: "Guide — MC Server Share",
  description: "How to install, host, and manage Minecraft servers with MC Server Share."
};

export default function GuidePage() {
  return (
    <main className="page-shell">
      <nav className="topbar">
        <a className="brand" href="/">MC Server Share</a>
        <a className="health-link" href="/share/XQZPU8">Share page →</a>
      </nav>

      <div className="guide">

        {/* Intro */}
        <section className="guide-intro">
          <p className="eyebrow">How it works</p>
          <h1>Your complete guide</h1>
          <p className="lead">
            MC Server Share lets a group of friends take turns hosting a Minecraft server from their own
            computers — no dedicated server, no port forwarding, no technical knowledge needed.
            One person hosts at a time. When they stop, the world saves to the cloud automatically.
            The next person downloads it and picks up exactly where things left off.
          </p>
        </section>

        {/* TOC */}
        <nav className="guide-toc">
          <p className="guide-toc-label">On this page</p>
          <ol>
            <li><a href="#install">1. Install the app</a></li>
            <li><a href="#first-time">2. First-time setup</a></li>
            <li><a href="#hosting">3. Hosting</a></li>
            <li><a href="#joining">4. Joining as a player</a></li>
            <li><a href="#discord">5. Discord command</a></li>
            <li><a href="#new-server">6. Setting up a new server</a></li>
            <li><a href="#mods">7. Using mods and modpacks</a></li>
            <li><a href="#updating">8. Updating mods or configs</a></li>
            <li><a href="#troubleshooting">9. Troubleshooting</a></li>
          </ol>
        </nav>

        {/* 1. Install */}
        <section className="guide-section" id="install">
          <h2>1. Install the app</h2>
          <p>Everyone needs to install the app once. Download the right version for your computer.</p>

          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Computer</th><th>File to download</th></tr>
              </thead>
              <tbody>
                <tr><td>Windows</td><td><code>MC.Server.Share_…_x64-setup.exe</code></td></tr>
                <tr><td>Mac — M1, M2, M3</td><td><code>MC.Server.Share_…_aarch64.dmg</code></td></tr>
                <tr><td>Mac — older Intel</td><td><code>MC.Server.Share_…_x64.dmg</code></td></tr>
              </tbody>
            </table>
          </div>

          <a className="button primary guide-cta" href={WIN_DOWNLOAD} target="_blank" rel="noreferrer">
            Download App
          </a>

          <div className="guide-callout guide-callout-warn">
            <strong>Windows security warning?</strong> Click <strong>More info</strong>, then <strong>Run anyway</strong>.
            The app isn't signed with a paid certificate, but it's safe.
          </div>
          <div className="guide-callout guide-callout-warn">
            <strong>Mac says it can't be opened?</strong> Right-click the app in Finder → <strong>Open</strong> → <strong>Open</strong> in the dialog. You only need to do this once.
          </div>
        </section>

        {/* 2. First-time setup */}
        <section className="guide-section" id="first-time">
          <h2>2. First-time setup</h2>
          <p>Do this once after installing. The app remembers everything from then on.</p>
          <ol className="guide-steps">
            <li>Open <strong>MC Server Share</strong></li>
            <li>Type your name in <strong>Display name</strong> — this is what others see when you're hosting</li>
            <li>Type the share code in <strong>Share code</strong> and click <strong>Load Share</strong>
              <ul>
                <li>For the current RLCraft / Dregora server, the code is <code>XQZPU8</code></li>
                <li>Or click a share link and the app opens with it pre-filled</li>
              </ul>
            </li>
          </ol>
          <div className="guide-callout guide-callout-info">
            <strong>You do not need any server files.</strong> The app downloads the full server — mods, configs,
            world — from the cloud the first time you host. Just install the app, enter your name, and you're ready.
          </div>
        </section>

        {/* 3. Hosting */}
        <section className="guide-section" id="hosting">
          <h2>3. Hosting</h2>
          <p>When it's your turn, this is the complete flow.</p>

          <h3>One-time setup before your first session</h3>
          <ol className="guide-steps">
            <li>Download the playit.gg client from <a href={PLAYIT_DOWNLOAD} target="_blank" rel="noreferrer">playit.gg/download</a></li>
            <li>In the app, click <strong>Set playit</strong> and select the file you downloaded</li>
            <li>The app remembers this — you won't need to do it again</li>
          </ol>

          <h3>Every session</h3>
          <ol className="guide-steps">
            <li>Open the app — your name and share code load automatically</li>
            <li>Click <strong>Download &amp; Host</strong>
              <ul>
                <li>The app downloads the latest world from whoever hosted last (a few minutes on first run, faster after that)</li>
                <li>The Minecraft server starts automatically</li>
                <li>playit.gg starts and gives you a public address so friends can connect</li>
              </ul>
            </li>
            <li>A join address like <code>abc123.joinmc.io:12345</code> appears in the <strong>Logs</strong> panel at the bottom — share it in Discord</li>
            <li>Friends connect in Minecraft → <strong>Multiplayer → Add Server</strong> → paste the address</li>
            <li>When you're done, click <strong>Stop and Upload</strong>
              <ul>
                <li>Saves and shuts down the server cleanly</li>
                <li>Uploads the world to the cloud so the next person gets your version</li>
              </ul>
            </li>
          </ol>

          <div className="guide-callout guide-callout-warn">
            <strong>Always click Stop and Upload when you're done.</strong> If you just close the app,
            the world won't be saved to the cloud and the next person will lose your session's progress.
          </div>
        </section>

        {/* 4. Joining */}
        <section className="guide-section" id="joining">
          <h2>4. Joining as a player</h2>
          <p>
            If someone else is hosting and you just want to play, you don't need to do anything in the app.
            Just connect to the address they post in Discord using Minecraft's multiplayer screen.
          </p>
          <p>
            Your Minecraft client version must match the server. For the current RLCraft server that's <strong>1.20.4</strong>.
            Switch your launcher profile to the right version if needed.
          </p>
        </section>

        {/* 5. Discord */}
        <section className="guide-section" id="discord">
          <h2>5. Discord command</h2>
          <p>Type <code>/host</code> in the Discord server at any time to:</p>
          <ul className="guide-list">
            <li>Check if anyone is currently hosting and who it is</li>
            <li>Get a link that opens the app with the share pre-loaded, if the server is free</li>
          </ul>
          <p>The bot doesn't start the server for you — you still click Download &amp; Host in the app. The Discord command is just a quick status check and shortcut.</p>
        </section>

        {/* 6. New server */}
        <section className="guide-section" id="new-server">
          <h2>6. Setting up a new server</h2>
          <p>
            Each game setup — a different Minecraft version, a different modpack — is its own <strong>share</strong>.
            Shares are independent. You can have as many as you want.
          </p>

          <h3>What is a server folder?</h3>
          <p>
            A Minecraft Java server is just a folder on your computer containing a server JAR file (the program that runs the game),
            a <code>server.properties</code> file, and optionally a mods folder and world data.
            You point the app at this folder, it reads the settings, and you're off.
          </p>

          <h3>Where to get a server JAR</h3>
          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Server type</th><th>Use case</th><th>Download</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vanilla</td>
                  <td>Plain Minecraft, no mods</td>
                  <td><a href={VANILLA_DOWNLOAD} target="_blank" rel="noreferrer">minecraft.net</a></td>
                </tr>
                <tr>
                  <td>Forge</td>
                  <td>Most modpacks (RLCraft, Create, etc.)</td>
                  <td><a href={FORGE_DOWNLOAD} target="_blank" rel="noreferrer">files.minecraftforge.net</a></td>
                </tr>
                <tr>
                  <td>Fabric</td>
                  <td>Lighter modpacks, Sodium/Lithium</td>
                  <td><a href={FABRIC_DOWNLOAD} target="_blank" rel="noreferrer">fabricmc.net</a></td>
                </tr>
                <tr>
                  <td>Paper</td>
                  <td>Vanilla + plugins, better performance</td>
                  <td><a href={PAPER_DOWNLOAD} target="_blank" rel="noreferrer">papermc.io</a></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            After downloading the JAR, run it once (you'll need <a href={JAVA_DOWNLOAD} target="_blank" rel="noreferrer">Java 17+</a> installed).
            Accept the EULA when prompted, then stop the server. The folder is ready to import.
          </p>

          <h3>Creating the share</h3>
          <ol className="guide-steps">
            <li>Open MC Server Share</li>
            <li>Click <strong>Import Server</strong> and select your server folder</li>
            <li>Enter a <strong>Share name</strong> (e.g. "Vanilla 1.21.5" or "Create Mod Server")</li>
            <li>Click <strong>Create Share</strong></li>
            <li><strong>Save the admin token</strong> that appears somewhere safe — you need it to update the server package later. A password manager or notes app works fine.</li>
            <li>Enter the admin token in the <strong>Admin token</strong> field</li>
            <li>Click <strong>Publish Server Package</strong> — this uploads your mods, configs, and JARs to the cloud</li>
            <li>Send friends the share URL or code</li>
          </ol>
        </section>

        {/* 7. Mods */}
        <section className="guide-section" id="mods">
          <h2>7. Using mods and modpacks</h2>

          <h3>Mods vs modpacks</h3>
          <p>
            A <strong>mod</strong> is a single file (e.g. <code>JEI-1.20.4-Forge.jar</code>) you drop into your server's <code>mods/</code> folder.
            A <strong>modpack</strong> is a curated collection of mods bundled together, usually downloaded from CurseForge or Modrinth.
          </p>

          <h3>Installing a modpack</h3>
          <p>
            Download the <strong>server pack</strong> version of the modpack (not the client pack — these are different downloads).
            It comes as a zip. Extract it, run the installer or the server JAR once to accept the EULA, then import that folder into the app.
          </p>

          <h3>Mod types — what goes where</h3>
          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Mod type</th><th>Server needs it?</th><th>Players need it?</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>World / gameplay mods (RLCraft, Create, etc.)</td>
                  <td>Yes</td>
                  <td>Yes — download the client modpack</td>
                </tr>
                <tr>
                  <td>Optimization (Lithium, Starlight)</td>
                  <td>Server versions: yes</td>
                  <td>Client versions: install separately in launcher</td>
                </tr>
                <tr>
                  <td>Client-only (shaders, minimaps, inventory tweaks)</td>
                  <td>No</td>
                  <td>Yes — install separately in launcher, doesn't affect server</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="guide-callout guide-callout-info">
            MC Server Share publishes the server-side files. Players need to install their client-side mods
            separately using their Minecraft launcher (CurseForge App, Prism Launcher, ATLauncher, etc.).
          </div>

          <h3>Java version</h3>
          <p>Different Minecraft versions need different Java versions:</p>
          <div className="guide-table-wrap">
            <table>
              <thead>
                <tr><th>Minecraft version</th><th>Java needed</th></tr>
              </thead>
              <tbody>
                <tr><td>1.17 and newer</td><td>Java 17+</td></tr>
                <tr><td>1.16 and older</td><td>Java 8</td></tr>
              </tbody>
            </table>
          </div>
          <p>Download Java from <a href={JAVA_DOWNLOAD} target="_blank" rel="noreferrer">adoptium.net</a>. You can have multiple Java versions installed at the same time.</p>
        </section>

        {/* 8. Updating */}
        <section className="guide-section" id="updating">
          <h2>8. Updating mods or configs</h2>
          <p>
            The <strong>world</strong> is saved automatically every time someone clicks Stop and Upload — you never need to do anything special for the world.
          </p>
          <p>
            The <strong>server package</strong> (mods, configs, JARs) only needs to be re-uploaded when you actually change something.
            To update it:
          </p>
          <ol className="guide-steps">
            <li>Make your changes in the local server folder (add/remove/update mods, edit configs, etc.)</li>
            <li>Test that the server still starts locally</li>
            <li>Open the app, load the share, enter the admin token</li>
            <li>Click <strong>Publish Server Package</strong></li>
            <li>The next time anyone clicks Download &amp; Host, they get the updated files automatically</li>
          </ol>
          <div className="guide-callout guide-callout-warn">
            <strong>Tell your friends before changing mods.</strong> If you update the server package, players need to update their client-side mods too, or they'll get a version mismatch error when trying to connect.
          </div>
        </section>

        {/* 9. Troubleshooting */}
        <section className="guide-section" id="troubleshooting">
          <h2>9. Troubleshooting</h2>

          <div className="guide-faq">
            <div className="guide-faq-item">
              <p className="guide-faq-q">App is stuck on "Restoring last session…"</p>
              <p>Check your internet connection. Close and reopen the app. If it keeps happening, the coordinator might be briefly unavailable — try again in a minute.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Server crashes immediately after starting</p>
              <p>Java is probably missing or the wrong version. Download Java 17+ from <a href={JAVA_DOWNLOAD} target="_blank" rel="noreferrer">adoptium.net</a>. Check the Logs panel for the exact error — it usually says what went wrong.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">playit.gg doesn't show an address</p>
              <p>Wait up to 60 seconds. If nothing appears, click <strong>Set playit</strong> and point it to the correct file again. Make sure your firewall isn't blocking playit.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Friends can't connect</p>
              <p>Make sure they're using the exact address from the Logs panel, including the port number (e.g. <code>abc.joinmc.io:12345</code>). The port is required.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">"Outdated server" or "outdated client" in Minecraft</p>
              <p>The Minecraft version on your computer doesn't match the server version. Check which version the server runs and switch your launcher profile to match.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">The previous person's world changes are missing</p>
              <p>They probably closed the app without clicking Stop and Upload. The world reverts to their last save. Nothing is permanently lost — it's just their unsaved session that's gone.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">Upload fails during Stop and Upload</p>
              <p>Internet dropped mid-upload. Click Stop and Upload again — it's safe to retry.</p>
            </div>
            <div className="guide-faq-item">
              <p className="guide-faq-q">I lost my admin token</p>
              <p>Create a new share. The old share still works for hosting — only publishing new server packages requires the token. Keep the new token somewhere safe this time.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
