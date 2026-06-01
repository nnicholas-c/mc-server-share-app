import { getCoordinator } from "@/runtime";

export const runtime = "nodejs";

const DISCORD_INTERACTION_TYPE_PING = 1;
const DISCORD_INTERACTION_TYPE_COMMAND = 2;
const DISCORD_RESPONSE_PONG = 1;
const DISCORD_RESPONSE_CHANNEL_MESSAGE = 4;

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return Response.json({ error: "Discord not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";

  if (!(await verifyDiscordSignature(publicKey, signature, timestamp, body))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  if (interaction.type === DISCORD_INTERACTION_TYPE_PING) {
    return Response.json({ type: DISCORD_RESPONSE_PONG });
  }

  if (interaction.type === DISCORD_INTERACTION_TYPE_COMMAND && interaction.data?.name === "host") {
    return Response.json({ type: DISCORD_RESPONSE_CHANNEL_MESSAGE, data: { content: await buildHostMessage() } });
  }

  return Response.json({ type: DISCORD_RESPONSE_CHANNEL_MESSAGE, data: { content: "Unknown command." } });
}

async function buildHostMessage(): Promise<string> {
  const shareCode = process.env.DISCORD_SHARE_CODE;
  const coordinatorUrl = process.env.PUBLIC_COORDINATOR_URL ?? "https://mc-server-share-app.vercel.app";

  if (!shareCode) {
    return "⚠️ Server share not configured. Ask the admin to set `DISCORD_SHARE_CODE`.";
  }

  try {
    const manifest = await getCoordinator().getManifest(shareCode);
    const shareUrl = `${coordinatorUrl}/share/${shareCode}`;
    const deepLink = `mcservershare://share/${shareCode}?coordinator=${encodeURIComponent(coordinatorUrl)}`;

    if (manifest.activeSession) {
      return `🟢 **${manifest.activeSession.hostDisplayName}** is hosting **${manifest.name}** right now. Check back when they're done!`;
    }

    const hasContent = manifest.currentPackage || manifest.latestSnapshot;
    if (!hasContent) {
      return `⚪ **${manifest.name}** has no server package yet. The admin needs to publish one first.`;
    }

    return [
      `✅ **${manifest.name}** is free to host!`,
      ``,
      `**To start hosting:**`,
      `1. Click this link to open the app: ${deepLink}`,
      `2. Make sure your display name is set`,
      `3. Click **Download & Host**`,
      ``,
      `Or visit the share page: ${shareUrl}`,
    ].join("\n");
  } catch {
    return "⚠️ Could not fetch server status. Try again in a moment.";
  }
}

async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body)
    );
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
