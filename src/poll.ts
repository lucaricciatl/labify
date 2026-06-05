/**
 * Polling module — periodically checks the API server version to detect
 * changes made via the API and triggers a full data refresh when needed.
 */

import { getApiVersion } from "./api-helper";

type ChangeCallback = () => Promise<void>;

let _interval: ReturnType<typeof setInterval> | null = null;
let _callback: ChangeCallback | null = null;

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds
const VERSION_KEY = "labify-last-api-version";

function getStoredVersion(): number | null {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    return v !== null ? Number(v) : null;
  } catch {
    return null;
  }
}

function setStoredVersion(v: number) {
  try {
    localStorage.setItem(VERSION_KEY, String(v));
  } catch {
    // storage may be full
  }
}

export async function checkForChanges(): Promise<boolean> {
  const version = await getApiVersion();
  if (version === null) return false;
  const lastKnown = getStoredVersion();
  if (lastKnown !== null && version > lastKnown) {
    setStoredVersion(version);
    return true;
  }
  setStoredVersion(version);
  return false;
}

export function startPolling(onChange: ChangeCallback): void {
  _callback = onChange;
  // Immediately check if server has newer data than what we've seen before
  checkForChanges().then((changed) => {
    if (changed && _callback) {
      console.log("[Poll] Server has new data, pulling immediately...");
      _callback();
    }
  });
  _interval = setInterval(async () => {
    const changed = await checkForChanges();
    if (changed && _callback) {
      console.log("[Poll] API version changed, pulling data...");
      await _callback();
    }
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  _callback = null;
}
