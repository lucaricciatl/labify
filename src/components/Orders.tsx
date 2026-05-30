import { useState } from "react";
import { Pencil, Trash2, Plus, FileSpreadsheet, Search, Check, PackageCheck } from "lucide-react";
import { useStore, useOrderActions, useInventoryActions } from "../store";
import type { Order } from "../types";
import Modal from "./Modal";
import { downloadExcel } from "../export";

function empty(): Order {
  return { id: "", materialCode: "", supplierId: "", quantity: 0, unitPrice: 0, batch: "", orderedDate: "" };
}

export default function Orders() {
  const { state } = useStore();
  const orderActions = useOrderActions();
  const inventoryActions = useInventoryActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [search, setSearch] = useState("");

  const openAdd = () => {
    setEditing({ ...empty(), orderedDate: new Date().toISOString().slice(0, 10) });
    setModal(true);
  };

  const openEdit = (o: Order) => {
    setEditing({ ...o });
    setModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const o = { ...editing, id: editing.id.trim() || crypto.randomUUID().slice(0, 8) };
    if (!o.materialCode.trim() || !o.supplierId.trim()) return;
    const exists = state.orders.find((x) => x.id === o.id);
    if (exists) await orderActions.update(o);
    else await orderActions.add(o);
    setModal(false);
  };

  const del = async (id: string) => {
    if (confirm("Delete this order?")) await orderActions.remove(id);
  };

  const receive = async (o: Order) => {
    if (!confirm(`Mark order ${o.id} as received?`)) return;
    await inventoryActions.add({
      id: crypto.randomUUID(),
      materialCode: o.materialCode,
      supplierId: o.supplierId,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      batch: o.batch,
      receivedDate: new Date().toISOString().slice(0, 10),
    });
    await orderActions.remove(o.id);
  };

  const exportXlsx = () => {
    downloadExcel(
      "orders.xlsx",
      "Orders",
      state.orders.map((o) => {
        const mat = state.materials.find((m) => m.code === o.materialCode);
        const supplier = state.suppliers.find((s) => s.id === o.supplierId);
        return {
          "Order ID": o.id,
          "Material Code": o.materialCode,
          "Material Name": mat?.name ?? "",
          Supplier: supplier?.name ?? o.supplierId,
          Quantity: o.quantity,
          "Unit Price": o.unitPrice,
          "Line Total": o.quantity * o.unitPrice,
          Batch: o.batch,
          "Ordered Date": o.orderedDate,
        };
      })
    );
  };

  const q = search.toLowerCase();
  const filtered = state.orders.filter((o) => {
    const mat = state.materials.find((m) => m.code === o.materialCode);
    const s = state.suppliers.find((x) => x.id === o.supplierId);
    const hay = [o.id, o.materialCode, mat?.name ?? "", o.batch, s?.name ?? ""].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const totalValue = filtered.reduce((sum, o) => sum + o.quantity * o.unitPrice, 0);

  return (
    <div className="section">
      <div className="section-header">
        <h2>Orders</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." />
          </div>
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Order</button>
        </div>
      </div>

      <div className="inventory-summary">
        <div className="inventory-stat">
          <PackageCheck size={18} />
          <div>
            <strong>{filtered.length}</strong>
            <span>Pending order(s)</span>
          </div>
        </div>
        <div className="inventory-stat">
          <FileSpreadsheet size={18} />
          <div>
            <strong>${totalValue.toFixed(2)}</strong>
            <span>Total value</span>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Material</th>
              <th>Supplier</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Ordered</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const mat = state.materials.find((m) => m.code === o.materialCode);
              const supplier = state.suppliers.find((s) => s.id === o.supplierId);
              return (
                <tr key={o.id}>
                  <td><span className="mono-id">{o.id}</span></td>
                  <td>{mat?.name ?? o.materialCode}</td>
                  <td>{supplier?.name ?? o.supplierId}</td>
                  <td><span className="mono-id">{o.batch}</span></td>
                  <td>{o.quantity}</td>
                  <td>${o.unitPrice.toFixed(2)}</td>
                  <td><strong>${(o.quantity * o.unitPrice).toFixed(2)}</strong></td>
                  <td>{o.orderedDate}</td>
                  <td className="actions">
                    <button className="icon-btn" title="Mark received" onClick={() => receive(o)}><Check size={14} /></button>
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(o)}><Pencil size={14} /></button>
                    <button className="icon-btn danger" title="Delete" onClick={() => del(o.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="empty">No orders match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.orders.find((x) => x.id === editing?.id) ? "Edit Order" : "New Order"}>
        <div className="form">
          <div className="field">
            <label>Order ID</label>
            <input value={editing?.id || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), id: e.target.value }))} placeholder="Auto-generated if empty" />
          </div>
          <div className="field">
            <label>Material</label>
            <select value={editing?.materialCode || ""} onChange={(e) => {
              const code = e.target.value;
              const mat = state.materials.find((m) => m.code === code);
              setEditing((p) => ({
                ...(p || empty()),
                materialCode: code,
                supplierId: mat?.supplierId || p?.supplierId || "",
                unitPrice: mat?.price || p?.unitPrice || 0,
              }));
            }}>
              <option value="">Select material...</option>
              {state.materials.map((m) => (
                <option key={m.code} value={m.code}>{m.code} — {m.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Supplier</label>
            <select value={editing?.supplierId || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), supplierId: e.target.value }))}>
              <option value="">Select supplier...</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="field"><label>Quantity</label><input type="number" value={editing?.quantity ?? 0} onChange={(e) => setEditing((p) => ({ ...(p || empty()), quantity: parseInt(e.target.value) || 0 }))} /></div>
            <div className="field"><label>Unit Price ($)</label><input type="number" step={0.01} value={editing?.unitPrice ?? 0} onChange={(e) => setEditing((p) => ({ ...(p || empty()), unitPrice: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="row">
            <div className="field"><label>Batch</label><input value={editing?.batch || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), batch: e.target.value }))} /></div>
            <div className="field"><label>Ordered Date</label><input type="date" value={editing?.orderedDate || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), orderedDate: e.target.value }))} /></div>
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}
