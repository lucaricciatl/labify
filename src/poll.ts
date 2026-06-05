/**
 * Polling module — periodically checks the API server version to detect
 * changes made via the API and triggers a full data refresh when needed.
 */

import { getApiVersion } from "./api-helper";

type ChangeCallback = () => Promise<void>;

let _interval: ReturnType<typeof setInterval> | null = null;
let _lastVersion: number | null = null;
let _callback: ChangeCallback | null = null;

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

export async function checkForChanges(): Promise<boolean> {
  const version = await getApiVersion();
  if (version === null) return false;
  if (_lastVersion !== null && version > _lastVersion) {
    _lastVersion = version;
    return true;
  }
  _lastVersion = version;
  return false;
}

export function startPolling(onChange: ChangeCallback): void {
  _callback = onChange;
  // Do an initial version check so we don't immediately trigger a pull
  getApiVersion().then((v) => {
    _lastVersion = v;
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
  _lastVersion = null;
}
