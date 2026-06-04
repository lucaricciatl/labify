// Uses the nginx-proxied /api/ path — no configuration needed.

const API_BASE = "/api";

let _apiAvailable: boolean | null = null;

export function isApiAvailable(): boolean | null {
  return _apiAvailable;
}

export async function checkApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    _apiAvailable = res.ok;
    return res.ok;
  } catch {
    _apiAvailable = false;
    return false;
  }
}

// ─── Pull from API ──────────────────────────────────────────────
// Converts API snake_case backup to frontend camelCase format

function fixSupplier(s: Record<string, unknown>) {
  return { id: s.id, name: s.name, webpage: s.webpage };
}

function fixMaterial(m: Record<string, unknown>) {
  return {
    code: m.code,
    name: m.name,
    supplierId: m.supplier_id ?? m.supplierId ?? "",
    link: m.link ?? "",
    price: typeof m.price === "number" ? m.price : 0,
    consumable: Boolean(m.consumable),
    unit: (m.unit as string) ?? "unit",
    image: m.image ?? undefined,
    attachments: m.attachments ?? [],
  };
}

function fixInstrument(i: Record<string, unknown>) {
  return {
    code: i.code,
    name: i.name,
    supplierId: i.supplier_id ?? i.supplierId ?? "",
    link: i.link ?? "",
    price: typeof i.price === "number" ? i.price : 0,
    quantity: typeof i.quantity === "number" ? i.quantity : 1,
    image: i.image ?? undefined,
    attachments: i.attachments ?? [],
  };
}

function fixExperiment(e: Record<string, unknown>) {
  return {
    id: e.id,
    name: e.name,
    designId: e.design_id ?? e.designId ?? "",
    startingDate: e.starting_date ?? e.startingDate ?? "",
    endingDate: e.ending_date ?? e.endingDate ?? "",
    materials: e.materials ?? [],
    instruments: e.instruments ?? [],
    steps: e.steps ?? [],
    conclusion: e.conclusion ?? undefined,
    docLinks: e.docLinks ?? e.doc_links ?? [],
    attachments: e.attachments ?? [],
  };
}

function fixExperimentDesign(d: Record<string, unknown>) {
  return {
    id: d.id,
    name: d.name,
    objective: d.objective ?? undefined,
    hypothesis: d.hypothesis ?? undefined,
    materials: d.materials ?? [],
    instruments: d.instruments ?? [],
    steps: d.steps ?? [],
    conclusion: d.conclusion ?? undefined,
    attachments: d.attachments ?? [],
    createdAt: d.created_at ?? d.createdAt ?? undefined,
    updatedAt: d.updated_at ?? d.updatedAt ?? undefined,
  };
}

function fixOrder(o: Record<string, unknown>) {
  return {
    id: o.id,
    materialCode: o.material_code ?? o.materialCode ?? "",
    supplierId: o.supplier_id ?? o.supplierId ?? "",
    quantity: typeof o.quantity === "number" ? o.quantity : 0,
    unitPrice: o.unit_price ?? o.unitPrice ?? 0,
    batch: o.batch ?? "",
    orderedDate: o.ordered_date ?? o.orderedDate ?? "",
  };
}

function fixInventoryItem(inv: Record<string, unknown>) {
  return {
    id: inv.id,
    materialCode: inv.material_code ?? inv.materialCode ?? "",
    supplierId: inv.supplier_id ?? inv.supplierId ?? "",
    quantity: typeof inv.quantity === "number" ? inv.quantity : 0,
    unitPrice: inv.unit_price ?? inv.unitPrice ?? 0,
    batch: inv.batch ?? "",
    receivedDate: inv.received_date ?? inv.receivedDate ?? "",
  };
}

interface ApiBackup {
  suppliers: Record<string, unknown>[];
  materials: Record<string, unknown>[];
  instruments: Record<string, unknown>[];
  experiments: Record<string, unknown>[];
  experimentDesigns: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
}

export interface PullResult {
  ok: boolean;
  message: string;
  data?: {
    suppliers: ReturnType<typeof fixSupplier>[];
    materials: ReturnType<typeof fixMaterial>[];
    instruments: ReturnType<typeof fixInstrument>[];
    experiments: ReturnType<typeof fixExperiment>[];
    experimentDesigns: ReturnType<typeof fixExperimentDesign>[];
    orders: ReturnType<typeof fixOrder>[];
    inventory: ReturnType<typeof fixInventoryItem>[];
  };
}

export async function pullFromApi(): Promise<PullResult> {
  try {
    const res = await fetch(`${API_BASE}/backup`);
    if (!res.ok) return { ok: false, message: `Server returned ${res.status}` };
    const backup = (await res.json()) as ApiBackup;

    return {
      ok: true,
      message: `Pulled ${(backup.suppliers?.length ?? 0)} suppliers, ${(backup.materials?.length ?? 0)} materials, ${(backup.instruments?.length ?? 0)} instruments, ${(backup.experiments?.length ?? 0)} experiments, ${(backup.experimentDesigns?.length ?? 0)} designs, ${(backup.orders?.length ?? 0)} orders, ${(backup.inventory?.length ?? 0)} inventory.`,
      data: {
        suppliers: (backup.suppliers ?? []).map(fixSupplier),
        materials: (backup.materials ?? []).map(fixMaterial),
        instruments: (backup.instruments ?? []).map(fixInstrument),
        experiments: (backup.experiments ?? []).map(fixExperiment),
        experimentDesigns: (backup.experimentDesigns ?? []).map(fixExperimentDesign),
        orders: (backup.orders ?? []).map(fixOrder),
        inventory: (backup.inventory ?? []).map(fixInventoryItem),
      },
    };
  } catch (e) {
    return { ok: false, message: `Pull failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ─── Push to API ─────────────────────────────────────────────────

export async function pushToApi(
  data: Record<string, unknown[]>
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Status ${res.status}` }));
      return { ok: false, message: err.error ?? `Status ${res.status}` };
    }
    return { ok: true, message: "Pushed successfully" };
  } catch (e) {
    return { ok: false, message: `Push failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
