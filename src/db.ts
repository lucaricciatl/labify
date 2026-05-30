import type { Supplier, Material, Instrument, Experiment, Order, InventoryItem } from "./types";

const DB_NAME = "LabifyDB";
const DB_VERSION = 10;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ? String(req.error) : "DB error");
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      [...db.objectStoreNames].forEach((name) => db.deleteObjectStore(name));
      db.createObjectStore("suppliers", { keyPath: "id" });
      db.createObjectStore("materials", { keyPath: "code" });
      db.createObjectStore("instruments", { keyPath: "code" });
      db.createObjectStore("experiments", { keyPath: "id" });
      db.createObjectStore("orders", { keyPath: "id" });
      db.createObjectStore("inventory", { keyPath: "id" });
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
    await withStore("orders", "readwrite", (store) => store.clear());
    await withStore("inventory", "readwrite", (store) => store.clear());
  },
};
