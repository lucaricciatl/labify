import { useState, useRef } from "react";
import { Pencil, Trash2, Plus, Image as ImageIcon, FileSpreadsheet, Search } from "lucide-react";
import { useStore, useMaterialActions } from "../store";
import type { Material } from "../types";
import Modal from "./Modal";
import { downloadExcel } from "../export";
import { AttachmentList, AttachmentUploader, useAttachmentHelpers } from "./Attachments";

function empty(): Material {
  return { code: "", name: "", supplierId: "", link: "", price: 0, consumable: true, unit: "", image: "", attachments: [] };
}

export default function Materials() {
  const { state } = useStore();
  const actions = useMaterialActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    fileRef: docRef,
    addFile: addDoc,
    removeFile: removeDoc,
  } = useAttachmentHelpers(editing?.attachments, (items) => {
    setEditing((prev) => (prev ? { ...prev, attachments: items } : prev));
  });

  const openAdd = () => {
    setEditing(empty());
    setModal(true);
  };

  const openEdit = (m: Material) => {
    setEditing({ ...m, attachments: m.attachments ? [...m.attachments] : [] });
    setModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const m = { ...editing, code: editing.code.trim() || crypto.randomUUID().slice(0, 6) };
    if (!m.name.trim() || !m.supplierId) return;
    const exists = state.materials.find((x) => x.code === m.code);
    if (exists) await actions.update(m);
    else await actions.add(m);
    setModal(false);
  };

  const del = async (code: string) => {
    if (confirm("Delete this material?")) await actions.remove(code);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditing((prev) => (prev ? { ...prev, image: reader.result as string } : prev));
    };
    reader.readAsDataURL(file);
  };

  const exportXlsx = () => {
    downloadExcel(
      "materials.xlsx",
      "Materials",
      state.materials.map((m) => {
        const supplier = state.suppliers.find((s) => s.id === m.supplierId);
        return {
          Code: m.code,
          Name: m.name,
          Supplier: supplier?.name ?? m.supplierId,
          Link: m.link,
          Price: m.price,
          Unit: m.unit,
          Consumable: m.consumable ? "Yes" : "No",
          Documents: m.attachments?.length ?? 0,
        };
      })
    );
  };

  const q = search.toLowerCase();
  const filtered = state.materials.filter((m) => {
    const s = state.suppliers.find((x) => x.id === m.supplierId);
    const hay = [m.code, m.name, s?.name ?? "", m.link].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Materials</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials..." />
          </div>
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="card-grid">
          {filtered.map((m) => {
            const supplier = state.suppliers.find((s) => s.id === m.supplierId);
            return (
              <div className="card" key={m.code}>
                <div className="card-image-box">
                  {m.image ? <img src={m.image} alt={m.name} /> : <div className="card-image-placeholder"><ImageIcon size={28} /></div>}
                </div>
                <div className="card-body">
                  <div className="card-title-row">
                    <strong>{m.name}</strong>
                    <span className="badge" style={{ opacity: m.consumable ? 1 : 0.4 }}>{m.consumable ? "Consumable" : "Equipment"}</span>
                  </div>
                  <div className="card-meta">
                    <span><span className="mono-id">{m.code}</span></span>
                    <span>Supplier: {supplier?.name ?? m.supplierId}</span>
                    <span>Price: ${m.price.toFixed(2)} / {m.unit}</span>
                  </div>
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noreferrer" className="link">View product →</a>
                  )}
                  <AttachmentList items={m.attachments} />
                </div>
                <div className="card-actions">
                  <button className="icon-btn" onClick={() => openEdit(m)}><Pencil size={14} /></button>
                  <button className="icon-btn danger" onClick={() => del(m.code)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty">No materials match your search.</div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.materials.find((x) => x.code === editing?.code) ? "Edit Material" : "New Material"}>
        <div className="form">
          <div className="field"><label>Material Code</label><input value={editing?.code || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), code: e.target.value }))} placeholder="Auto-generated if empty" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), name: e.target.value }))} placeholder="e.g. Ethanol 96%" /></div>
          <div className="field"><label>Supplier</label><select value={editing?.supplierId || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), supplierId: e.target.value }))}><option value="">Select supplier...</option>{state.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></div>
          <div className="field"><label>Link</label><input value={editing?.link || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), link: e.target.value }))} placeholder="https://..." /></div>
          <div className="field"><label>Unit of Measure</label><input value={editing?.unit || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), unit: e.target.value }))} placeholder="e.g. mL, g, unit" /></div>
          <div className="row">
            <div className="field"><label>Price ($)</label><input type="number" step={0.01} value={editing?.price ?? 0} onChange={(e) => setEditing((p) => ({ ...(p || empty()), price: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="field checkbox-field"><label><input type="checkbox" checked={editing?.consumable ?? true} onChange={(e) => setEditing((p) => ({ ...(p || empty()), consumable: e.target.checked }))} /> Consumable</label></div>
          </div>
          <div className="field">
            <label>Image</label>
            <div className="image-upload">
              {editing?.image ? <img src={editing.image} alt="preview" className="image-preview" /> : <div className="image-preview-placeholder"><ImageIcon size={24} /></div>}
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>{editing?.image ? "Change image" : "Upload image"}</button>
            </div>
          </div>
          <div className="field"><label>Documents</label><AttachmentList items={editing?.attachments} editable onRemove={removeDoc} /><AttachmentUploader fileRef={docRef} onChange={addDoc} /></div>
          <div className="form-actions"><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}
