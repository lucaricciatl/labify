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
      design_id TEXT,
      starting_date TEXT NOT NULL,
      ending_date TEXT NOT NULL,
      materials_json TEXT DEFAULT '[]',
      instruments_json TEXT DEFAULT '[]',
      steps_json TEXT DEFAULT '[]',
      conclusion TEXT,
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

    CREATE TABLE IF NOT EXISTS experiment_designs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      objective TEXT,
      hypothesis TEXT,
      materials_json TEXT DEFAULT '[]',
      instruments_json TEXT DEFAULT '[]',
      steps_json TEXT DEFAULT '[]',
      conclusion TEXT,
      attachments_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO meta (key, value) VALUES ('version', '0');
  `);

  // ─── Create triggers to bump version on every write ─
  const tables = ['suppliers', 'materials', 'instruments', 'experiments', 'orders', 'inventory', 'experiment_designs'];
  for (const table of tables) {
    const bumpSql = `
      CREATE TRIGGER IF NOT EXISTS ${table}_version_bump_insert AFTER INSERT ON ${table}
      BEGIN
        UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'version';
      END;
      CREATE TRIGGER IF NOT EXISTS ${table}_version_bump_update AFTER UPDATE ON ${table}
      BEGIN
        UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'version';
      END;
      CREATE TRIGGER IF NOT EXISTS ${table}_version_bump_delete AFTER DELETE ON ${table}
      BEGIN
        UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'version';
      END;
    `;
    db.exec(bumpSql);
  }

  // ─── Migration: add columns to experiments if they don't exist ─
  try { db.exec(`ALTER TABLE experiments ADD COLUMN design_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE experiments ADD COLUMN steps_json TEXT DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE experiments ADD COLUMN conclusion TEXT`); } catch {}

  // ─── Migration: drop experiment_id from experiment_designs ─────
  const designCols = db.prepare("PRAGMA table_info(experiment_designs)").all() as { name: string }[];
  const hasExpId = designCols.some((c) => c.name === "experiment_id");
  if (hasExpId) {
    db.exec(`
      CREATE TABLE _tmp_experiment_designs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT,
        hypothesis TEXT,
        materials_json TEXT DEFAULT '[]',
        instruments_json TEXT DEFAULT '[]',
        steps_json TEXT DEFAULT '[]',
        conclusion TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO _tmp_experiment_designs (id, name, objective, hypothesis, materials_json, instruments_json, steps_json, conclusion, created_at, updated_at)
      SELECT id, name, objective, hypothesis, materials_json, instruments_json, steps_json, conclusion, created_at, updated_at FROM experiment_designs;
      DROP TABLE experiment_designs;
      ALTER TABLE _tmp_experiment_designs RENAME TO experiment_designs;
    `);
  }

  // ─── Migration: add attachments_json to experiment_designs ──
  try { db.exec(`ALTER TABLE experiment_designs ADD COLUMN attachments_json TEXT DEFAULT '[]'`); } catch {}
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
