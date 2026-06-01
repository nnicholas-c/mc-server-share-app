import { describe, expect, it } from "vitest";
import {
  DesktopProfileSchema,
  PROTOCOL_VERSION,
  ShareManifestSchema
} from "./index";

describe("protocol schemas", () => {
  it("fills desktop profile defaults", () => {
    const profile = DesktopProfileSchema.parse({
      serverPath: "C:/servers/test",
      serverType: "vanilla",
      startCommand: "java -jar server.jar nogui"
    });

    expect(profile.javaPath).toBe("java");
    expect(profile.memoryMb).toBe(4096);
    expect(profile.serverPort).toBe(25565);
    expect(profile.levelName).toBe("world");
  });

  it("accepts a manifest without package or snapshot", () => {
    const manifest = ShareManifestSchema.parse({
      code: "ABC123",
      name: "Friends world",
      port: 25565,
      requiredProtocolVersion: PROTOCOL_VERSION,
      currentPackage: null,
      latestSnapshot: null,
      activeSession: null
    });

    expect(manifest.code).toBe("ABC123");
  });
});
