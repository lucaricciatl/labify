/**
 * API Helper — individual CRUD operations for each entity.
 * Used by store actions to sync changes to the server API in real time.
 */

const API_BASE = "/api";

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error ?? `HTTP ${res.status}` };
    }
    const data = (res.status === 204 ? undefined : await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Suppliers ──────────────────────────────────────────────────
export const suppliers = {
  list: () => request<Record<string, unknown>[]>("GET", "/suppliers"),
  get: (id: string) => request<Record<string, unknown>>("GET", `/suppliers/${id}`),
  add: (s: { id: string; name: string; webpage: string }) =>
    request("POST", "/suppliers", s),
  update: (id: string, s: { name: string; webpage: string }) =>
    request("PATCH", `/suppliers/${id}`, s),
  delete: (id: string) => request("DELETE", `/suppliers/${id}`),
};

// ─── Materials ──────────────────────────────────────────────────
export const materials = {
  list: () => request<Record<string, unknown>[]>("GET", "/materials"),
  get: (code: string) => request<Record<string, unknown>>("GET", `/materials/${code}`),
  add: (m: Record<string, unknown>) => request("POST", "/materials", m),
  update: (code: string, m: Record<string, unknown>) =>
    request("PATCH", `/materials/${code}`, m),
  delete: (code: string) => request("DELETE", `/materials/${code}`),
};

// ─── Instruments ────────────────────────────────────────────────
export const instruments = {
  list: () => request<Record<string, unknown>[]>("GET", "/instruments"),
  get: (code: string) => request<Record<string, unknown>>("GET", `/instruments/${code}`),
  add: (i: Record<string, unknown>) => request("POST", "/instruments", i),
  update: (code: string, i: Record<string, unknown>) =>
    request("PATCH", `/instruments/${code}`, i),
  delete: (code: string) => request("DELETE", `/instruments/${code}`),
};

// ─── Experiments ────────────────────────────────────────────────
export const experiments = {
  list: () => request<Record<string, unknown>[]>("GET", "/experiments"),
  get: (id: string) => request<Record<string, unknown>>("GET", `/experiments/${id}`),
  add: (e: Record<string, unknown>) => request("POST", "/experiments", e),
  update: (id: string, e: Record<string, unknown>) =>
    request("PATCH", `/experiments/${id}`, e),
  delete: (id: string) => request("DELETE", `/experiments/${id}`),
};

// ─── Experiment Designs ─────────────────────────────────────────
export const experimentDesigns = {
  list: () => request<Record<string, unknown>[]>("GET", "/experiment_designs"),
  get: (id: string) => request<Record<string, unknown>>("GET", `/experiment_designs/${id}`),
  add: (d: Record<string, unknown>) => request("POST", "/experiment_designs", d),
  update: (id: string, d: Record<string, unknown>) =>
    request("PATCH", `/experiment_designs/${id}`, d),
  delete: (id: string) => request("DELETE", `/experiment_designs/${id}`),
};

// ─── Orders ─────────────────────────────────────────────────────
export const orders = {
  list: () => request<Record<string, unknown>[]>("GET", "/orders"),
  get: (id: string) => request<Record<string, unknown>>("GET", `/orders/${id}`),
  add: (o: Record<string, unknown>) => request("POST", "/orders", o),
  update: (id: string, o: Record<string, unknown>) =>
    request("PATCH", `/orders/${id}`, o),
  delete: (id: string) => request("DELETE", `/orders/${id}`),
};

// ─── Inventory ──────────────────────────────────────────────────
export const inventory = {
  list: () => request<Record<string, unknown>[]>("GET", "/inventory"),
  get: (id: string) => request<Record<string, unknown>>("GET", `/inventory/${id}`),
  add: (i: Record<string, unknown>) => request("POST", "/inventory", i),
  update: (id: string, i: Record<string, unknown>) =>
    request("PATCH", `/inventory/${id}`, i),
  delete: (id: string) => request("DELETE", `/inventory/${id}`),
};

// ─── Health / Version ───────────────────────────────────────────
export async function getApiVersion(): Promise<number | null> {
  const res = await request<{ version: number }>("GET", "/health");
  if (res.ok && res.data) return res.data.version;
  return null;
}

// Re-export checkApiAvailable from api-sync for convenience
export { checkApiAvailable, isApiAvailable } from "./api-sync";
