import type { Supplier, Material, Instrument, Experiment, Order, InventoryItem, Procedure } from "./types";

const DB_NAME = "LabifyDB";
const DB_VERSION = 12;
const MIGRATION_BACKUP_PREFIX = "labify-migration-backup";

const STORES = [
  { name: "suppliers", keyPath: "id" },
  { name: "materials", keyPath: "code" },
  { name: "instruments", keyPath: "code" },
  { name: "experiments", keyPath: "id" },
  { name: "orders", keyPath: "id" },
  { name: "procedures", keyPath: "id" },
] as const;

function migrationBackupKey(version: number) {
  return `${MIGRATION_BACKUP_PREFIX}-v${version}`;
}

function saveMigrationBackup(version: number, data: Record<string, unknown[]>) {
  try {
    localStorage.setItem(migrationBackupKey(version), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Storage might be full for very large datasets
  }
}

export function loadMigrationBackup(version: number): Record<string, unknown[]> | null {
  try {
    const raw = localStorage.getItem(migrationBackupKey(version));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error ? String(req.error) : "DB error");
    req.onsuccess = () => resolve(req.result);
    req.onblocked = () => reject("Database upgrade blocked. Please close all other Labify tabs and reload.");

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const tx = req.transaction;

      // Backup existing data before any destructive change
      const existingStores = Array.from(db.objectStoreNames);
      let pending = existingStores.length;
      const backup: Record<string, unknown[]> = {};

      function finishUpgrade() {
        if (oldVersion > 0) {
          saveMigrationBackup(oldVersion, backup);
        }

        const existing = new Set<string>(db.objectStoreNames);

        // Non-destructive creation: only add missing stores.
        // This is the safe default. If a future schema change requires
        // deleting a store, gate it behind an oldVersion check and
        // migrate the data explicitly from `backup`.
        for (const def of STORES) {
          if (!existing.has(def.name)) {
            db.createObjectStore(def.name, { keyPath: def.keyPath });
          }
        }
      }

      if (pending === 0) {
        finishUpgrade();
        return;
      }

      for (const name of existingStores) {
        const store = tx!.objectStore(name);
        const getReq = store.getAll();
        getReq.onsuccess = () => {
          backup[name] = getReq.result ?? [];
          pending--;
          if (pending === 0) finishUpgrade();
        };
        getReq.onerror = () => {
          backup[name] = [];
          pending--;
          if (pending === 0) finishUpgrade();
        };
      }
    };
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ? String(req.error) : "Store error");
  });
}

export const db = {
  // Suppliers
  async getAllSuppliers(): Promise<Supplier[]> { return withStore("suppliers", "readonly", (s) => s.getAll()); },
  async putSupplier(s: Supplier): Promise<void> { await withStore("suppliers", "readwrite", (store) => store.put(s)); },
  async deleteSupplier(id: string): Promise<void> { await withStore("suppliers", "readwrite", (store) => store.delete(id)); },

  // Materials
  async getAllMaterials(): Promise<Material[]> { return withStore("materials", "readonly", (s) => s.getAll()); },
  async putMaterial(m: Material): Promise<void> { await withStore("materials", "readwrite", (store) => store.put(m)); },
  async deleteMaterial(code: string): Promise<void> { await withStore("materials", "readwrite", (store) => store.delete(code)); },

  // Instruments
  async getAllInstruments(): Promise<Instrument[]> { return withStore("instruments", "readonly", (s) => s.getAll()); },
  async putInstrument(i: Instrument): Promise<void> { await withStore("instruments", "readwrite", (store) => store.put(i)); },
  async deleteInstrument(code: string): Promise<void> { await withStore("instruments", "readwrite", (store) => store.delete(code)); },

  // Experiments
  async getAllExperiments(): Promise<Experiment[]> { return withStore("experiments", "readonly", (s) => s.getAll()); },
  async putExperiment(e: Experiment): Promise<void> { await withStore("experiments", "readwrite", (store) => store.put(e)); },
  async deleteExperiment(id: string): Promise<void> { await withStore("experiments", "readwrite", (store) => store.delete(id)); },

  // Procedures
  async getAllProcedures(): Promise<Procedure[]> { return withStore("procedures", "readonly", (s) => s.getAll()); },
  async putProcedure(p: Procedure): Promise<void> { await withStore("procedures", "readwrite", (store) => store.put(p)); },
  async deleteProcedure(id: string): Promise<void> { await withStore("procedures", "readwrite", (store) => store.delete(id)); },

  // Orders
  async getAllOrders(): Promise<Order[]> { return withStore("orders", "readonly", (s) => s.getAll()); },
  async putOrder(o: Order): Promise<void> { await withStore("orders", "readwrite", (store) => store.put(o)); },
  async deleteOrder(id: string): Promise<void> { await withStore("orders", "readwrite", (store) => store.delete(id)); },

  // Inventory
  async getAllInventory(): Promise<InventoryItem[]> { return withStore("inventory", "readonly", (s) => s.getAll()); },
  async putInventoryItem(i: InventoryItem): Promise<void> { await withStore("inventory", "readwrite", (store) => store.put(i)); },
  async deleteInventoryItem(id: string): Promise<void> { await withStore("inventory", "readwrite", (store) => store.delete(id)); },

  async clearAll(): Promise<void> {
    await withStore("suppliers", "readwrite", (store) => store.clear());
    await withStore("materials", "readwrite", (store) => store.clear());
    await withStore("instruments", "readwrite", (store) => store.clear());
    await withStore("experiments", "readwrite", (store) => store.clear());
    await withStore("procedures", "readwrite", (store) => store.clear());
    await withStore("orders", "readwrite", (store) => store.clear());
    await withStore("inventory", "readwrite", (store) => store.clear());
  },

  async exportAll(): Promise<Record<string, unknown[]>> {
    const result: Record<string, unknown[]> = {};
    for (const def of STORES) {
      result[def.name] = await withStore(def.name, "readonly", (s) => s.getAll());
    }
    return result;
  },

  async importAll(data: Record<string, unknown[]>): Promise<void> {
    for (const def of STORES) {
      const items = data[def.name] ?? [];
      for (const item of items) {
        await withStore(def.name, "readwrite", (s) => s.put(item));
      }
    }
  },
};
