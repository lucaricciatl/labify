import { useState } from "react";
import { Pencil, Trash2, Plus, FileSpreadsheet, Search } from "lucide-react";
import { useStore, useSupplierActions } from "../store";
import type { Supplier } from "../types";
import Modal from "./Modal";
import { downloadExcel } from "../export";

function empty(): Supplier {
  return { id: "", name: "", webpage: "" };
}

export default function Suppliers() {
  const { state } = useStore();
  const actions = useSupplierActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");

  const openAdd = () => {
    setEditing(empty());
    setModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing({ ...s });
    setModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const s = { ...editing, id: editing.id.trim() || crypto.randomUUID().slice(0, 6) };
    if (!s.name.trim()) return;
    const exists = state.suppliers.find((x) => x.id === s.id);
    if (exists) await actions.update(s);
    else await actions.add(s);
    setModal(false);
  };

  const del = async (id: string) => {
    if (confirm("Delete this supplier?")) await actions.remove(id);
  };

  const exportXlsx = () => {
    downloadExcel(
      "suppliers.xlsx",
      "Suppliers",
      state.suppliers.map((s) => ({
        ID: s.id,
        Name: s.name,
        Webpage: s.webpage,
      }))
    );
  };

  const q = search.toLowerCase();
  const filtered = state.suppliers.filter((s) => {
    const hay = [s.id, s.name, s.webpage].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Suppliers</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
            />
          </div>
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Webpage</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td><a href={s.webpage} target="_blank" rel="noreferrer" className="link">{s.webpage}</a></td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                  <button className="icon-btn danger" onClick={() => del(s.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="empty">No suppliers match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing?.id && state.suppliers.find((x) => x.id === editing.id) ? "Edit Supplier" : "New Supplier"}>
        <div className="form">
          <div className="field"><label>ID</label><input value={editing?.id || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), id: e.target.value }))} placeholder="Auto-generated if empty" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), name: e.target.value }))} /></div>
          <div className="field"><label>Webpage</label><input value={editing?.webpage || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), webpage: e.target.value }))} placeholder="https://..." /></div>
          <div className="form-actions"><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}
