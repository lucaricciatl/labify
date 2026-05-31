import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { db, json, parseJson } from "./db.js";

const app = express();
const PORT = Number(process.env.API_PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

// ─── Email transport ───────────────────────────────────────────
const emailService = process.env.EMAIL_SERVICE;           // e.g. "gmail"
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL || "labify@localhost";
const appUrl = process.env.APP_URL || "http://localhost:5173";

function createTransporter() {
  if (emailService) {
    // Uses built-in nodemailer well-known services (gmail, outlook, etc.)
    if (!smtpUser || !smtpPass) {
      console.warn("[EMAIL] EMAIL_SERVICE is set but SMTP_USER/SMTP_PASS are missing.");
      return null;
    }
    return nodemailer.createTransport({
      service: emailService,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }
  if (smtpHost) {
    const hasAuth = !!(smtpUser && smtpPass);
    if (!hasAuth) {
      console.warn("[EMAIL] SMTP_HOST is set but SMTP_USER/SMTP_PASS are missing. Most servers require authentication.");
    }
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: hasAuth ? { user: smtpUser, pass: smtpPass } : undefined,
      tls: { rejectUnauthorized: false },
    });
  }
  return null;
}

const transporter = createTransporter();
let emailReady = false;

if (transporter) {
  transporter.verify((err) => {
    if (err) {
      console.error("[EMAIL] Transporter verification failed:", err.message);
      emailReady = false;
    } else {
      console.log("[EMAIL] SMTP transporter ready — emails will be sent.");
      emailReady = true;
    }
  });
} else {
  console.log("[EMAIL] No SMTP configured — verification links will be printed to the console.");
}

type EmailResult = { sent: boolean; mock?: boolean; link?: string; error?: string };

async function sendVerificationEmail(to: string, token: string, name?: string): Promise<EmailResult> {
  const link = `${appUrl}/verify?token=${token}`;
  if (!transporter) {
    console.log(`[EMAIL MOCK] Verification link for ${to}: ${link}`);
    return { sent: false, mock: true, link };
  }
  try {
    await transporter.sendMail({
      from: `"Labify" <${fromEmail}>`,
      to,
      subject: "Verify your Labify account",
      html: `
        <h2>Welcome to Labify 🧪</h2>
        <p>Hi ${name || "there"},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${link}" style="padding:10px 16px;background:#0D9488;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
        <p>Or copy this URL: <code>${link}</code></p>
        <p>If you didn't create this account, you can ignore this email.</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL] sendMail failed:", msg);
    return { sent: false, error: msg };
  }
}

// ─── Middleware ──────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json({ limit: "10mb" }));

interface AuthRequest extends express.Request {
  user?: { id: string; email: string; name: string | null };
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─── Health ──────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), emailConfigured: !!transporter, emailReady });
});

// ─── Auth ────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Email required and password must be at least 6 characters" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, verified, verification_token) VALUES (?, ?, ?, ?, 1, NULL)").run(id, email.toLowerCase().trim(), hash, name || null);

  const token = jwt.sign({ id, email, name: name || null }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ id, token, user: { id, email, name: name || null }, message: "Account created successfully." });
});

app.get("/api/auth/verify", (req, res) => {
  res.json({ message: "Email verification is disabled. You can log in immediately." });
});

app.post("/api/auth/resend", (_req, res) => {
  res.json({ message: "Email verification is disabled. You can log in immediately." });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = db.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?").get(email.toLowerCase().trim()) as { id: string; email: string; name: string; password_hash: string } | undefined;
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get("/api/auth/me", authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// ─── Generic CRUD factory ────────────────────────────────────────
function crudRoutes(
  name: string,
  table: string,
  pk: string,
  columns: string[],
  jsonCols: string[] = []
) {
  const colList = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.map((c) => `${c} = ?`).join(", ");

  app.get(`/api/${name}`, (_req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    res.json(
      rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (jsonCols.includes(k)) {
            out[k.replace("_json", "")] = parseJson(v as string);
          } else if (k === "consumable") {
            out[k] = Boolean(v);
          } else {
            out[k] = v;
          }
        }
        return out;
      })
    );
  });

  app.get(`/api/${name}/:${pk}`, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(req.params[pk]) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: "Not found" });
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (jsonCols.includes(k)) {
        out[k.replace("_json", "")] = parseJson(v as string);
      } else if (k === "consumable") {
        out[k] = Boolean(v);
      } else {
        out[k] = v;
      }
    }
    res.json(out);
  });

  app.post(`/api/${name}`, (req, res) => {
    try {
      const vals = columns.map((c) => {
        if (jsonCols.includes(c)) return json(req.body[c.replace("_json", "")]);
        if (c === "consumable") return req.body[c] ? 1 : 0;
        return req.body[c] ?? null;
      });
      db.prepare(`INSERT INTO ${table} (${colList}) VALUES (${placeholders})`).run(vals);
      res.status(201).json({ [pk]: req.body[pk] });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch(`/api/${name}/:${pk}`, (req, res) => {
    try {
      const vals = columns.map((c) => {
        if (jsonCols.includes(c)) return json(req.body[c.replace("_json", "")]);
        if (c === "consumable") return req.body[c] ? 1 : 0;
        return req.body[c] ?? null;
      });
      db.prepare(`UPDATE ${table} SET ${updates} WHERE ${pk} = ?`).run([...vals, req.params[pk]]);
      res.json({ updated: req.params[pk] });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete(`/api/${name}/:${pk}`, (req, res) => {
    const result = db.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).run(req.params[pk]);
    if (result.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: req.params[pk] });
  });
}

// ─── Register routes ─────────────────────────────────────────────
crudRoutes("suppliers", "suppliers", "id", ["id", "name", "webpage"]);
crudRoutes("materials", "materials", "code", ["code", "name", "supplier_id", "link", "price", "consumable", "unit", "image", "attachments_json"], ["attachments_json"]);
crudRoutes("instruments", "instruments", "code", ["code", "name", "supplier_id", "link", "price", "quantity", "image", "attachments_json"], ["attachments_json"]);
crudRoutes("experiments", "experiments", "id", ["id", "name", "starting_date", "ending_date", "materials_json", "instruments_json", "doc_links_json", "attachments_json"], ["materials_json", "instruments_json", "doc_links_json", "attachments_json"]);
crudRoutes("orders", "orders", "id", ["id", "material_code", "supplier_id", "quantity", "unit_price", "batch", "ordered_date"]);
crudRoutes("inventory", "inventory", "id", ["id", "material_code", "supplier_id", "quantity", "unit_price", "batch", "received_date"]);

// ─── Full backup / restore ───────────────────────────────────────
app.get("/api/backup", (_req, res) => {
  const backup = {
    suppliers: db.prepare("SELECT * FROM suppliers").all(),
    materials: (db.prepare("SELECT * FROM materials").all() as Record<string, unknown>[]).map((r) => ({ ...r, attachments: parseJson(r.attachments_json as string) })),
    instruments: (db.prepare("SELECT * FROM instruments").all() as Record<string, unknown>[]).map((r) => ({ ...r, attachments: parseJson(r.attachments_json as string) })),
    experiments: (db.prepare("SELECT * FROM experiments").all() as Record<string, unknown>[]).map((r) => ({
      ...r,
      materials: parseJson(r.materials_json as string),
      instruments: parseJson(r.instruments_json as string),
      docLinks: parseJson(r.doc_links_json as string),
      attachments: parseJson(r.attachments_json as string),
    })),
    orders: db.prepare("SELECT * FROM orders").all(),
    inventory: db.prepare("SELECT * FROM inventory").all(),
    timestamp: Date.now(),
  };
  res.json(backup);
});

app.post("/api/restore", (req, res) => {
  try {
    const data = req.body;
    const insertSuppliers = db.prepare("INSERT OR REPLACE INTO suppliers (id, name, webpage) VALUES (?, ?, ?)");
    const insertMaterials = db.prepare("INSERT OR REPLACE INTO materials (code, name, supplier_id, link, price, consumable, unit, image, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertInstruments = db.prepare("INSERT OR REPLACE INTO instruments (code, name, supplier_id, link, price, quantity, image, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertExperiments = db.prepare("INSERT OR REPLACE INTO experiments (id, name, starting_date, ending_date, materials_json, instruments_json, doc_links_json, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertOrders = db.prepare("INSERT OR REPLACE INTO orders (id, material_code, supplier_id, quantity, unit_price, batch, ordered_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const insertInventory = db.prepare("INSERT OR REPLACE INTO inventory (id, material_code, supplier_id, quantity, unit_price, batch, received_date) VALUES (?, ?, ?, ?, ?, ?, ?)");

    const restore = db.transaction(() => {
      for (const s of data.suppliers || []) insertSuppliers.run(s.id, s.name, s.webpage);
      for (const m of data.materials || []) insertMaterials.run(m.code, m.name, m.supplier_id ?? m.supplierId, m.link, m.price, m.consumable ? 1 : 0, m.unit, m.image ?? null, json(m.attachments));
      for (const i of data.instruments || []) insertInstruments.run(i.code, i.name, i.supplier_id ?? i.supplierId, i.link, i.price, i.quantity, i.image ?? null, json(i.attachments));
      for (const e of data.experiments || []) insertExperiments.run(e.id, e.name, e.starting_date ?? e.startingDate, e.ending_date ?? e.endingDate, json(e.materials), json(e.instruments), json(e.docLinks ?? e.doc_links), json(e.attachments));
      for (const o of data.orders || []) insertOrders.run(o.id, o.material_code ?? o.materialCode, o.supplier_id ?? o.supplierId, o.quantity, o.unit_price ?? o.unitPrice, o.batch, o.ordered_date ?? o.orderedDate);
      for (const inv of data.inventory || []) insertInventory.run(inv.id, inv.material_code ?? inv.materialCode, inv.supplier_id ?? inv.supplierId, inv.quantity, inv.unit_price ?? inv.unitPrice, inv.batch, inv.received_date ?? inv.receivedDate);
    });
    restore();
    res.json({ restored: true, timestamp: Date.now() });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Labify API listening on http://0.0.0.0:${PORT}`);
});
