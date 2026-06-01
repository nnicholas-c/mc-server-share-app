import { describe, expect, it } from "vitest";
import { CoordinatorService } from "./coordinator";
import { MemoryRepository } from "./memoryRepository";

function makeService() {
  const repository = new MemoryRepository();
  return {
    repository,
    service: new CoordinatorService(repository, "https://share.example")
  };
}

describe("CoordinatorService", () => {
  it("creates a share and returns an admin token once", async () => {
    const { service } = makeService();

    const result = await service.createShare({
      name: "Friends world",
      port: 25565,
      requiredProtocolVersion: "1"
    });

    expect(result.manifest.name).toBe("Friends world");
    expect(result.manifest.currentPackage).toBeNull();
    expect(result.adminToken.length).toBeGreaterThan(20);
    expect(result.shareUrl).toContain(result.manifest.code);
  });

  it("prevents concurrent hosts for the same share", async () => {
    const { service } = makeService();
    const share = await service.createShare({
      name: "Lock test",
      port: 25565,
      requiredProtocolVersion: "1"
    });

    await service.claimHostLock(share.manifest.code, {
      hostDisplayName: "Alex",
      deviceIdHash: "device-one"
    });

    await expect(
      service.claimHostLock(share.manifest.code, {
        hostDisplayName: "Sam",
        deviceIdHash: "device-two"
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("extends an active host lock on heartbeat", async () => {
    const { service } = makeService();
    const share = await service.createShare({
      name: "Heartbeat",
      port: 25565,
      requiredProtocolVersion: "1"
    });

    const lock = await service.claimHostLock(share.manifest.code, {
      hostDisplayName: "Alex",
      deviceIdHash: "device-one"
    });

    const updated = await service.heartbeat(lock.session.id, lock.lockToken);
    expect(updated.session.status).toBe("active");
    expect(new Date(updated.session.expiresAt).getTime()).toBeGreaterThan(
      new Date(lock.session.expiresAt).getTime() - 1000
    );
  });

  it("rejects world uploads without the active lock token", async () => {
    const { service } = makeService();
    const share = await service.createShare({
      name: "Upload auth",
      port: 25565,
      requiredProtocolVersion: "1"
    });

    const lock = await service.claimHostLock(share.manifest.code, {
      hostDisplayName: "Alex",
      deviceIdHash: "device-one"
    });

    await expect(
      service.authorizeUpload({
        uploadType: "world",
        shareCode: share.manifest.code,
        sessionId: lock.session.id,
        lockToken: "wrong",
        expectedSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        size: 100,
        archiveFormat: "tar.zst"
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("publishes a world snapshot only after a completed Blob upload is recorded", async () => {
    const { service } = makeService();
    const share = await service.createShare({
      name: "Snapshots",
      port: 25565,
      requiredProtocolVersion: "1"
    });
    const lock = await service.claimHostLock(share.manifest.code, {
      hostDisplayName: "Alex",
      deviceIdHash: "device-one"
    });

    const sha =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const url = "https://blob.example/world.tar.zst";

    const upload = await service.authorizeUpload({
      uploadType: "world",
      shareCode: share.manifest.code,
      sessionId: lock.session.id,
      lockToken: lock.lockToken,
      expectedSha256: sha,
      size: 123,
      archiveFormat: "tar.zst"
    });

    const payload = JSON.parse(upload.tokenPayload);
    await service.recordCompletedUpload({
      uploadType: "world",
      shareId: payload.shareId,
      sessionId: lock.session.id,
      url,
      pathname: "world.tar.zst",
      sha256: sha,
      size: 123,
      archiveFormat: "tar.zst"
    });

    const complete = await service.completeSession(lock.session.id, {
      lockToken: lock.lockToken,
      blobUrl: url,
      sha256: sha,
      size: 123,
      archiveFormat: "tar.zst",
      hostDisplayName: "Alex"
    });

    expect(complete.snapshot.version).toBe(1);
    const manifest = await service.getManifest(share.manifest.code);
    expect(manifest.latestSnapshot?.url).toBe(url);
    expect(manifest.activeSession).toBeNull();
  });

  it("publishes server packages only with the admin token", async () => {
    const { service } = makeService();
    const share = await service.createShare({
      name: "Package publish",
      port: 25565,
      requiredProtocolVersion: "1"
    });
    const sha =
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const url = "https://blob.example/server.tar.zst";

    await expect(
      service.authorizeUpload({
        uploadType: "package",
        shareCode: share.manifest.code,
        adminToken: "wrong",
        expectedSha256: sha,
        size: 456,
        archiveFormat: "tar.zst"
      })
    ).rejects.toMatchObject({ status: 401 });

    const upload = await service.authorizeUpload({
      uploadType: "package",
      shareCode: share.manifest.code,
      adminToken: share.adminToken,
      expectedSha256: sha,
      size: 456,
      archiveFormat: "tar.zst"
    });
    const payload = JSON.parse(upload.tokenPayload);

    await service.recordCompletedUpload({
      uploadType: "package",
      shareId: payload.shareId,
      sessionId: null,
      url,
      pathname: "server.tar.zst",
      sha256: sha,
      size: 456,
      archiveFormat: "tar.zst"
    });

    const result = await service.publishPackage(share.manifest.code, {
      adminToken: share.adminToken,
      blobUrl: url,
      sha256: sha,
      size: 456,
      archiveFormat: "tar.zst"
    });

    expect(result.serverPackage.version).toBe(1);
    const manifest = await service.getManifest(share.manifest.code);
    expect(manifest.currentPackage?.url).toBe(url);
  });
});
