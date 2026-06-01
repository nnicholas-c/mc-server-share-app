/**
 * One-time script to register the /host slash command with Discord.
 *
 * Prerequisites:
 *   1. Create a Discord Application at https://discord.com/developers/applications
 *   2. Copy Application ID, Public Key, and Bot Token into apps/coordinator/.env.local
 *   3. Set the Interactions Endpoint URL in your Discord app to:
 *      https://mc-server-share-app.vercel.app/api/discord
 *
 * Run with:
 *   node scripts/register-discord-command.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envFile = readFileSync(resolve(__dirname, "../apps/coordinator/.env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, "")];
    })
    .filter(([k]) => k)
);

const appId = env.DISCORD_APPLICATION_ID;
const token = env.DISCORD_BOT_TOKEN;

if (!appId || !token) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in apps/coordinator/.env.local first.");
  process.exit(1);
}

const command = {
  name: "host",
  description: "Check who is hosting the Minecraft server or get the link to start hosting.",
};

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "POST",
  headers: { Authorization: token, "Content-Type": "application/json" },
  body: JSON.stringify(command),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Failed to register command (${res.status}): ${body}`);
  process.exit(1);
}

const data = await res.json();
console.log(`✅ Registered /host command (id: ${data.id})`);
console.log(`\nNow add your bot to the server with this URL (replace CLIENT_ID):`);
console.log(`https://discord.com/oauth2/authorize?client_id=${appId}&scope=applications.commands`);
