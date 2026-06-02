import type { AppState } from "./store";
import { loadWebDAVConfig, syncToWebDAV, restoreFromWebDAV, saveWebDAVConfig, testWebDAV } from "./webdav";

let dirty = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface SyncStatus {
  syncing: boolean;
  lastMessage: string;
  connected: boolean;
}

const listeners: Set<(status: SyncStatus) => void> = new Set();

function notify(status: SyncStatus) {
  listeners.forEach((fn) => fn(status));
}

export function onSyncChange(cb: (status: SyncStatus) => void) {
  listeners.add(cb);
  const cfg = loadWebDAVConfig();
  cb({ syncing: false, lastMessage: cfg ? "Connected" : "Not configured", connected: !!cfg });
  return () => { listeners.delete(cb); };
}

export async function triggerSync(state: AppState) {
  const cfg = loadWebDAVConfig();
  if (!cfg) return;

  notify({ syncing: true, lastMessage: "Syncing...", connected: true });

  const result = await syncToWebDAV(
    {
      suppliers: state.suppliers,
      materials: state.materials,
      instruments: state.instruments,
      experiments: state.experiments,
      procedures: state.procedures,
      orders: state.orders,
      inventory: state.inventory,
      timestamp: Date.now(),
    },
    cfg
  );

  notify({ syncing: false, lastMessage: result.message, connected: true });
}

export function markDirty(state: AppState) {
  dirty = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (dirty) {
      dirty = false;
      triggerSync(state);
    }
  }, 800);
}

export async function restoreFromCloud(): Promise<Partial<AppState> | null> {
  const cfg = loadWebDAVConfig();
  if (!cfg) return null;

  const result = await restoreFromWebDAV(cfg);
  if (!result.ok || !result.data) return null;

  try {
    const parsed = JSON.parse(result.data);
    if (parsed.suppliers && parsed.materials && parsed.experiments) {
      return {
        suppliers: parsed.suppliers,
        materials: parsed.materials,
        instruments: parsed.instruments || [],
        experiments: parsed.experiments,
        procedures: parsed.procedures || [],
        orders: parsed.orders || [],
        inventory: parsed.inventory || [],
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function setupWebDAV(cfg: { url: string; username: string; password: string; fileName: string }): Promise<{ ok: boolean; message: string }> {
  const test = await testWebDAV(cfg);
  if (!test.ok) return test;
  saveWebDAVConfig(cfg);
  notify({ syncing: false, lastMessage: "Connected", connected: true });
  return test;
}

export { loadWebDAVConfig, testWebDAV };
export function disconnectWebDAV() {
  localStorage.removeItem("labify-webdav");
  notify({ syncing: false, lastMessage: "Disconnected", connected: false });
}
