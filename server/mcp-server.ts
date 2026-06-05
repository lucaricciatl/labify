#!/usr/bin/env node
/**
 * MCP Server for Labify
 * 
 * Implements the Model Context Protocol (MCP) over stdio, allowing LLMs
 * (Claude Desktop, etc.) to interact with the Labify database remotely.
 * 
 * Usage:
 *   npx tsx server/mcp-server.ts
 * 
 * Or configure in Claude Desktop:
 *   {
 *     "mcpServers": {
 *       "labify": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/labify/server/mcp-server.ts"],
 *         "env": { "DATABASE_PATH": "/path/to/labify/data/labify.db" }
 *       }
 *     }
 *   }
 */

import { db, json, parseJson } from "./db.js";

// ─── JSON-RPC helpers ──────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function sendResponse(response: JsonRpcResponse) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

// ─── Tool definitions ──────────────────────────────────────────
interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  { name: "list_suppliers", description: "List all suppliers in the lab database", inputSchema: { type: "object", properties: {} } },
  { name: "list_materials", description: "List all materials (chemicals, consumables, etc.)", inputSchema: { type: "object", properties: {} } },
  { name: "list_instruments", description: "List all lab instruments and equipment", inputSchema: { type: "object", properties: {} } },
  { name: "list_experiments", description: "List all experiments", inputSchema: { type: "object", properties: {} } },
  { name: "list_orders", description: "List all purchase orders", inputSchema: { type: "object", properties: {} } },
  { name: "list_inventory", description: "List all inventory items", inputSchema: { type: "object", properties: {} } },
  { name: "list_experiment_designs", description: "List all experiment designs/protocols", inputSchema: { type: "object", properties: {} } },
  
  { name: "get_supplier", description: "Get a single supplier by ID", inputSchema: { type: "object", properties: { id: { type: "string", description: "Supplier ID" } }, required: ["id"] } },
  { name: "get_material", description: "Get a single material by code", inputSchema: { type: "object", properties: { code: { type: "string", description: "Material code" } }, required: ["code"] } },
  { name: "get_instrument", description: "Get a single instrument by code", inputSchema: { type: "object", properties: { code: { type: "string", description: "Instrument code" } }, required: ["code"] } },
  { name: "get_experiment", description: "Get a single experiment by ID", inputSchema: { type: "object", properties: { id: { type: "string", description: "Experiment ID" } }, required: ["id"] } },
  { name: "get_order", description: "Get a single order by ID", inputSchema: { type: "object", properties: { id: { type: "string", description: "Order ID" } }, required: ["id"] } },
  { name: "get_inventory_item", description: "Get a single inventory item by ID", inputSchema: { type: "object", properties: { id: { type: "string", description: "Inventory ID" } }, required: ["id"] } },
  { name: "get_experiment_design", description: "Get a single experiment design by ID", inputSchema: { type: "object", properties: { id: { type: "string", description: "Design ID" } }, required: ["id"] } },

  { name: "add_material", description: "Add a new material", inputSchema: { type: "object", properties: { code: { type: "string" }, name: { type: "string" }, supplier_id: { type: "string" }, link: { type: "string" }, price: { type: "number" }, consumable: { type: "boolean" }, unit: { type: "string" }, image: { type: "string" } }, required: ["code", "name", "supplier_id"] } },
  { name: "update_material", description: "Update an existing material", inputSchema: { type: "object", properties: { code: { type: "string" }, name: { type: "string" }, supplier_id: { type: "string" }, link: { type: "string" }, price: { type: "number" }, consumable: { type: "boolean" }, unit: { type: "string" }, image: { type: "string" } }, required: ["code"] } },
  { name: "delete_material", description: "Delete a material by code", inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },

  { name: "add_instrument", description: "Add a new instrument", inputSchema: { type: "object", properties: { code: { type: "string" }, name: { type: "string" }, supplier_id: { type: "string" }, link: { type: "string" }, price: { type: "number" }, quantity: { type: "number" }, image: { type: "string" } }, required: ["code", "name", "supplier_id"] } },
  { name: "update_instrument", description: "Update an existing instrument", inputSchema: { type: "object", properties: { code: { type: "string" }, name: { type: "string" }, supplier_id: { type: "string" }, link: { type: "string" }, price: { type: "number" }, quantity: { type: "number" }, image: { type: "string" } }, required: ["code"] } },
  { name: "delete_instrument", description: "Delete an instrument by code", inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },

  { name: "add_supplier", description: "Add a new supplier", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, webpage: { type: "string" } }, required: ["id", "name"] } },
  { name: "update_supplier", description: "Update an existing supplier", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, webpage: { type: "string" } }, required: ["id"] } },
  { name: "delete_supplier", description: "Delete a supplier by ID", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },

  { name: "add_experiment", description: "Add a new experiment", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, design_id: { type: "string" }, starting_date: { type: "string" }, ending_date: { type: "string" }, materials_json: { type: "string", description: "JSON array of {materialCode, quantityNeeded, unit}" }, instruments_json: { type: "string", description: "JSON array of {instrumentCode, quantityNeeded}" }, steps_json: { type: "string", description: "JSON array of steps" }, conclusion: { type: "string" }, doc_links_json: { type: "string", description: "JSON array of {id, label, url}" } }, required: ["id", "name", "starting_date", "ending_date"] } },
  { name: "delete_experiment", description: "Delete an experiment by ID", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },

  { name: "add_order", description: "Add a new order", inputSchema: { type: "object", properties: { id: { type: "string" }, material_code: { type: "string" }, supplier_id: { type: "string" }, quantity: { type: "number" }, unit_price: { type: "number" }, batch: { type: "string" }, ordered_date: { type: "string" } }, required: ["id", "material_code", "supplier_id"] } },
  { name: "delete_order", description: "Delete an order by ID", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },

  { name: "add_inventory_item", description: "Add a new inventory item", inputSchema: { type: "object", properties: { id: { type: "string" }, material_code: { type: "string" }, supplier_id: { type: "string" }, quantity: { type: "number" }, unit_price: { type: "number" }, batch: { type: "string" }, received_date: { type: "string" } }, required: ["id", "material_code", "supplier_id"] } },
  { name: "delete_inventory_item", description: "Delete an inventory item by ID", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },

  { name: "export_all", description: "Export all data as a JSON backup", inputSchema: { type: "object", properties: {} } },
  { name: "import_all", description: "Import data from a JSON backup (bulk insert/replace)", inputSchema: { type: "object", properties: { data: { type: "string", description: "JSON string of the backup" } }, required: ["data"] } },
];

// ─── Tool handlers ─────────────────────────────────────────────
function handleToolCall(name: string, params: Record<string, unknown>): unknown {
  const rowsToResult = (rows: Record<string, unknown>[]) =>
    rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (k.endsWith("_json")) {
          out[k.replace("_json", "")] = parseJson(v as string);
        } else {
          out[k] = v;
        }
      }
      return out;
    });

  switch (name) {
    // ─── List ──────────────────────────────────────────────
    case "list_suppliers":
      return db.prepare("SELECT * FROM suppliers").all();
    case "list_materials":
      return rowsToResult(db.prepare("SELECT * FROM materials").all() as Record<string, unknown>[]);
    case "list_instruments":
      return rowsToResult(db.prepare("SELECT * FROM instruments").all() as Record<string, unknown>[]);
    case "list_experiments":
      return rowsToResult(db.prepare("SELECT * FROM experiments").all() as Record<string, unknown>[]);
    case "list_orders":
      return db.prepare("SELECT * FROM orders").all();
    case "list_inventory":
      return db.prepare("SELECT * FROM inventory").all();
    case "list_experiment_designs":
      return rowsToResult(db.prepare("SELECT * FROM experiment_designs").all() as Record<string, unknown>[]);

    // ─── Get single ───────────────────────────────────────
    case "get_supplier":
      return db.prepare("SELECT * FROM suppliers WHERE id = ?").get(params.id) ?? { error: "Not found" };
    case "get_material":
      return rowsToResult([db.prepare("SELECT * FROM materials WHERE code = ?").get(params.code) as Record<string, unknown>])[0] ?? { error: "Not found" };
    case "get_instrument":
      return rowsToResult([db.prepare("SELECT * FROM instruments WHERE code = ?").get(params.code) as Record<string, unknown>])[0] ?? { error: "Not found" };
    case "get_experiment":
      return rowsToResult([db.prepare("SELECT * FROM experiments WHERE id = ?").get(params.id) as Record<string, unknown>])[0] ?? { error: "Not found" };
    case "get_order":
      return db.prepare("SELECT * FROM orders WHERE id = ?").get(params.id) ?? { error: "Not found" };
    case "get_inventory_item":
      return db.prepare("SELECT * FROM inventory WHERE id = ?").get(params.id) ?? { error: "Not found" };
    case "get_experiment_design":
      return rowsToResult([db.prepare("SELECT * FROM experiment_designs WHERE id = ?").get(params.id) as Record<string, unknown>])[0] ?? { error: "Not found" };

    // ─── Materials CRUD ───────────────────────────────────
    case "add_material":
      db.prepare("INSERT INTO materials (code, name, supplier_id, link, price, consumable, unit, image, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]')").run(
        params.code, params.name, params.supplier_id, params.link ?? "", params.price ?? 0, params.consumable ? 1 : 0, params.unit ?? "unit", params.image ?? null
      );
      return { success: true, message: `Material ${params.code} added` };
    case "update_material":
      db.prepare("UPDATE materials SET name = ?, supplier_id = ?, link = ?, price = ?, consumable = ?, unit = ?, image = ? WHERE code = ?").run(
        params.name, params.supplier_id, params.link ?? "", params.price ?? 0, params.consumable ? 1 : 0, params.unit ?? "unit", params.image ?? null, params.code
      );
      return { success: true, message: `Material ${params.code} updated` };
    case "delete_material": {
      const result = db.prepare("DELETE FROM materials WHERE code = ?").run(params.code);
      return { success: result.changes > 0, message: result.changes > 0 ? `Material ${params.code} deleted` : "Not found" };
    }

    // ─── Instruments CRUD ─────────────────────────────────
    case "add_instrument":
      db.prepare("INSERT INTO instruments (code, name, supplier_id, link, price, quantity, image, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, '[]')").run(
        params.code, params.name, params.supplier_id, params.link ?? "", params.price ?? 0, params.quantity ?? 1, params.image ?? null
      );
      return { success: true, message: `Instrument ${params.code} added` };
    case "update_instrument":
      db.prepare("UPDATE instruments SET name = ?, supplier_id = ?, link = ?, price = ?, quantity = ?, image = ? WHERE code = ?").run(
        params.name, params.supplier_id, params.link ?? "", params.price ?? 0, params.quantity ?? 1, params.image ?? null, params.code
      );
      return { success: true, message: `Instrument ${params.code} updated` };
    case "delete_instrument": {
      const result2 = db.prepare("DELETE FROM instruments WHERE code = ?").run(params.code);
      return { success: result2.changes > 0, message: result2.changes > 0 ? `Instrument ${params.code} deleted` : "Not found" };
    }

    // ─── Suppliers CRUD ───────────────────────────────────
    case "add_supplier":
      db.prepare("INSERT INTO suppliers (id, name, webpage) VALUES (?, ?, ?)").run(params.id, params.name, params.webpage ?? "");
      return { success: true, message: `Supplier ${params.id} added` };
    case "update_supplier":
      db.prepare("UPDATE suppliers SET name = ?, webpage = ? WHERE id = ?").run(params.name, params.webpage ?? "", params.id);
      return { success: true, message: `Supplier ${params.id} updated` };
    case "delete_supplier": {
      const result3 = db.prepare("DELETE FROM suppliers WHERE id = ?").run(params.id);
      return { success: result3.changes > 0, message: result3.changes > 0 ? `Supplier ${params.id} deleted` : "Not found" };
    }

    // ─── Experiments ──────────────────────────────────────
    case "add_experiment":
      db.prepare("INSERT INTO experiments (id, name, design_id, starting_date, ending_date, materials_json, instruments_json, steps_json, conclusion, doc_links_json, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')").run(
        params.id, params.name, params.design_id ?? null, params.starting_date, params.ending_date,
        params.materials_json ?? "[]", params.instruments_json ?? "[]", params.steps_json ?? "[]", params.conclusion ?? null, params.doc_links_json ?? "[]"
      );
      return { success: true, message: `Experiment ${params.id} added` };
    case "delete_experiment": {
      const result4 = db.prepare("DELETE FROM experiments WHERE id = ?").run(params.id);
      return { success: result4.changes > 0, message: result4.changes > 0 ? `Experiment ${params.id} deleted` : "Not found" };
    }

    // ─── Orders ───────────────────────────────────────────
    case "add_order":
      db.prepare("INSERT INTO orders (id, material_code, supplier_id, quantity, unit_price, batch, ordered_date) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        params.id, params.material_code, params.supplier_id, params.quantity ?? 0, params.unit_price ?? 0, params.batch ?? "", params.ordered_date
      );
      return { success: true, message: `Order ${params.id} added` };
    case "delete_order": {
      const result5 = db.prepare("DELETE FROM orders WHERE id = ?").run(params.id);
      return { success: result5.changes > 0, message: result5.changes > 0 ? `Order ${params.id} deleted` : "Not found" };
    }

    // ─── Inventory ────────────────────────────────────────
    case "add_inventory_item":
      db.prepare("INSERT INTO inventory (id, material_code, supplier_id, quantity, unit_price, batch, received_date) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        params.id, params.material_code, params.supplier_id, params.quantity ?? 0, params.unit_price ?? 0, params.batch ?? "", params.received_date
      );
      return { success: true, message: `Inventory item ${params.id} added` };
    case "delete_inventory_item": {
      const result6 = db.prepare("DELETE FROM inventory WHERE id = ?").run(params.id);
      return { success: result6.changes > 0, message: result6.changes > 0 ? `Inventory item ${params.id} deleted` : "Not found" };
    }

    // ─── Bulk import/export ───────────────────────────────
    case "export_all": {
      const backup = {
        suppliers: db.prepare("SELECT * FROM suppliers").all(),
        materials: (db.prepare("SELECT * FROM materials").all() as Record<string, unknown>[]).map((r) => ({ ...r, attachments: parseJson(r.attachments_json as string) })),
        instruments: (db.prepare("SELECT * FROM instruments").all() as Record<string, unknown>[]).map((r) => ({ ...r, attachments: parseJson(r.attachments_json as string) })),
        experiments: (db.prepare("SELECT * FROM experiments").all() as Record<string, unknown>[]).map((r) => ({
          ...r,
          materials: parseJson(r.materials_json as string),
          instruments: parseJson(r.instruments_json as string),
          steps: parseJson(r.steps_json as string),
          docLinks: parseJson(r.doc_links_json as string),
          attachments: parseJson(r.attachments_json as string),
        })),
        experimentDesigns: (db.prepare("SELECT * FROM experiment_designs").all() as Record<string, unknown>[]).map((r) => ({
          ...r,
          materials: parseJson(r.materials_json as string),
          instruments: parseJson(r.instruments_json as string),
          steps: parseJson(r.steps_json as string),
          attachments: parseJson(r.attachments_json as string),
        })),
        orders: db.prepare("SELECT * FROM orders").all(),
        inventory: db.prepare("SELECT * FROM inventory").all(),
        timestamp: Date.now(),
      };
      return backup;
    }
    case "import_all": {
      try {
        const data = JSON.parse(params.data as string);
        const restore = db.transaction(() => {
          for (const t of ["suppliers", "materials", "instruments", "experiments", "experimentDesigns", "orders", "inventory"]) {
            const table = t === "experimentDesigns" ? "experiment_designs" : t;
            const items = data[t] ?? [];
            if (items.length === 0) continue;
            const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
            const colNames = cols.map((c) => c.name);
            const placeholders = colNames.map(() => "?").join(", ");
            const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`);
            for (const item of items) {
              const vals = colNames.map((cn) => {
                if (cn.endsWith("_json")) return json(item[cn] ?? item[cn.replace("_json", "")]);
                return item[cn] ?? null;
              });
              stmt.run(vals);
            }
          }
        });
        restore();
        return { success: true, message: "Data imported successfully" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Main MCP loop ────────────────────────────────────────────
let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const req: JsonRpcRequest = JSON.parse(trimmed);

      if (req.method === "initialize") {
        sendResponse({
          jsonrpc: "2.0",
          id: req.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "labify-mcp", version: "1.0.0" },
          },
        });
      } else if (req.method === "tools/list") {
        sendResponse({
          jsonrpc: "2.0",
          id: req.id,
          result: { tools: TOOLS },
        });
      } else if (req.method === "tools/call") {
        const { name, arguments: args } = req.params as { name: string; arguments?: Record<string, unknown> };
        try {
          const result = handleToolCall(name, args ?? {});
          sendResponse({
            jsonrpc: "2.0",
            id: req.id,
            result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
          });
        } catch (e) {
          sendResponse({
            jsonrpc: "2.0",
            id: req.id,
            result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true },
          });
        }
      } else if (req.method === "notifications/initialized") {
        // No response needed for notifications
      } else {
        sendResponse({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        });
      }
    } catch {
      // Invalid JSON — ignore
    }
  }
});

process.stdin.on("end", () => {
  process.exit(0);
});

// Keep alive
process.stdin.resume();
