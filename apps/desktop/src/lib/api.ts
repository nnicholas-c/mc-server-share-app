import type {
  ClaimLockResponse,
  CompleteSessionRequest,
  CreateDownloadUrlResponse,
  CreateShareResponse,
  DesktopProfile,
  PublishPackageRequest,
  ShareManifest
} from "@mc-share/protocol";

async function request<T>(
  coordinatorUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${coordinatorUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(body?.error?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createShare(profile: DesktopProfile, name: string, coordinatorUrl: string) {
  return request<CreateShareResponse>(coordinatorUrl, "/api/shares", {
    method: "POST",
    body: JSON.stringify({
      name,
      port: profile.serverPort,
      requiredProtocolVersion: "1"
    })
  });
}

export function getManifest(coordinatorUrl: string, shareCode: string) {
  return request<ShareManifest>(coordinatorUrl, `/api/shares/${shareCode}`);
}

export function claimLock(input: {
  coordinatorUrl: string;
  shareCode: string;
  hostDisplayName: string;
  deviceIdHash: string;
}) {
  return request<ClaimLockResponse>(
    input.coordinatorUrl,
    `/api/shares/${input.shareCode}/lock`,
    {
      method: "POST",
      body: JSON.stringify({
        hostDisplayName: input.hostDisplayName,
        deviceIdHash: input.deviceIdHash
      })
    }
  );
}

export function heartbeat(input: {
  coordinatorUrl: string;
  sessionId: string;
  lockToken: string;
}) {
  return request(input.coordinatorUrl, `/api/sessions/${input.sessionId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify({ lockToken: input.lockToken })
  });
}

export function completeSession(input: {
  coordinatorUrl: string;
  sessionId: string;
  request: CompleteSessionRequest;
}) {
  return request(input.coordinatorUrl, `/api/sessions/${input.sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify(input.request)
  });
}

export function publishPackage(input: {
  coordinatorUrl: string;
  shareCode: string;
  request: PublishPackageRequest;
}) {
  return request(input.coordinatorUrl, `/api/shares/${input.shareCode}/package`, {
    method: "POST",
    body: JSON.stringify(input.request)
  });
}

export function createDownloadUrl(input: {
  coordinatorUrl: string;
  shareCode: string;
  blobUrl: string;
}) {
  return request<CreateDownloadUrlResponse>(
    input.coordinatorUrl,
    `/api/shares/${input.shareCode}/download-url`,
    {
      method: "POST",
      body: JSON.stringify({ blobUrl: input.blobUrl })
    }
  );
}
