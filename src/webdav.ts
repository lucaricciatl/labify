async function davRequest(url: string, method: string, username: string, password: string, body?: string | Blob): Promise<Response> {
  const auth = btoa(`${username}:${password}`);
  return fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": body ? (typeof body === "string" ? "text/plain" : (body as Blob).type || "application/octet-stream") : "text/plain",
    },
    ...(body ? { body } : {}),
  });
}

function getPath(base: string, file: string) {
  const sanitized = base.replace(/\/+$/, "");
  return `${sanitized}/${file.replace(/^\//, "")}`;
}

export function loadWebDAVConfig(): { url: string; username: string; password: string; fileName: string } | null {
  try {
    const raw = localStorage.getItem("labify-webdav");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWebDAVConfig(cfg: { url: string; username: string; password: string; fileName: string }) {
  localStorage.setItem("labify-webdav", JSON.stringify(cfg));
}

export function clearWebDAVConfig() {
  localStorage.removeItem("labify-webdav");
}

export async function testWebDAV(cfg: { url: string; username: string; password: string }): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await davRequest(cfg.url, "PROPFIND", cfg.username, cfg.password);
    if (res.status === 207 || res.status === 200 || res.status === 404) {
      return { ok: true, message: "Connected successfully" };
    }
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function syncToWebDAV(
  data: unknown,
  config: { url: string; username: string; password: string; fileName: string }
): Promise<{ ok: boolean; message: string }> {
  try {
    const payload = JSON.stringify(data, null, 2);
    const path = getPath(config.url, config.fileName);
    const res = await davRequest(path, "PUT", config.username, config.password, payload);
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, message: "Synced to cloud" };
    }
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function restoreFromWebDAV(
  config: { url: string; username: string; password: string; fileName: string }
): Promise<{ ok: boolean; data?: string; message: string }> {
  try {
    const path = getPath(config.url, config.fileName);
    const res = await davRequest(path, "GET", config.username, config.password);
    if (res.status === 200) {
      const body = await res.text();
      return { ok: true, data: body, message: "Downloaded" };
    }
    if (res.status === 404) {
      return { ok: true, data: undefined, message: "No backup found" };
    }
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Download failed" };
  }
}
