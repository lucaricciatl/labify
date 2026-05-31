import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "labify.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// ─── Schema ────────────────────────────────────────────────────
const init = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      webpage TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      link TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      consumable INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'unit',
      image TEXT,
      attachments_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS instruments (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      link TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      attachments_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      starting_date TEXT NOT NULL,
      ending_date TEXT NOT NULL,
      materials_json TEXT DEFAULT '[]',
      instruments_json TEXT DEFAULT '[]',
      doc_links_json TEXT DEFAULT '[]',
      attachments_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      material_code TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      batch TEXT NOT NULL DEFAULT '',
      ordered_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      material_code TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      batch TEXT NOT NULL DEFAULT '',
      received_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
});
init();

// ─── Helpers ───────────────────────────────────────────────────
export function json(val: unknown) {
  return JSON.stringify(val);
}

export function parseJson<T>(text: string | null): T {
  if (!text) return [] as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return [] as unknown as T;
  }
}
