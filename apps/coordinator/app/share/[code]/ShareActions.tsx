"use client";

import { useState } from "react";

type Props = {
  deepLink: string;
  desktopDownloadUrl: string;
  shareCode: string;
  shareUrl: string;
};

export function ShareActions({
  deepLink,
  desktopDownloadUrl,
  shareCode,
  shareUrl
}: Props) {
  const [copied, setCopied] = useState("");

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <div className="actions">
      <a className="button primary" href={deepLink}>
        Open In MC Server Share
      </a>
      <a className="button secondary" href={desktopDownloadUrl}>
        Download App
      </a>
      <button className="quiet" type="button" onClick={() => copy(shareUrl, "link")}>
        Copy Share Link
      </button>
      <button className="quiet" type="button" onClick={() => copy(shareCode, "code")}>
        Copy Code
      </button>
      <p className="action-note">
        {copied ? `Copied ${copied}.` : "Install the app once, then this page can open it directly."}
      </p>
    </div>
  );
}
