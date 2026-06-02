import { useState, useRef } from "react";
import { Pencil, Trash2, Plus, Image as ImageIcon, FileSpreadsheet, Search, Check } from "lucide-react";
import { useStore, useInstrumentActions } from "../store";
import type { Instrument } from "../types";
import Modal from "./Modal";
import { downloadExcel } from "../export";
import { AttachmentList, AttachmentUploader, useAttachmentHelpers } from "./Attachments";

// ─── Preset images from public/assets/tools ─────────────────────
const PRESET_IMAGES: { file: string; label: string }[] = [
  { file: "01_Inverted_Microscope.png", label: "Inverted Microscope" },
  { file: "02_Benchtop_Centrifuge.png", label: "Benchtop Centrifuge" },
  { file: "03_Tube_Furnace__1400_C__Ar_atmosphere_.png", label: "Tube Furnace (1400°C, Ar atmosphere)" },
  { file: "04_Probe_Sonicator__750W__ice_bath_compatib.png", label: "Probe Sonicator (750W, ice bath compatible)" },
  { file: "05_Vacuum_Oven.png", label: "Vacuum Oven" },
  { file: "06_Field_Emission_SEM__Hitachi_S4800_.png", label: "Field Emission SEM (Hitachi S4800)" },
  { file: "07_XRD_Diffractometer__PANalytical_X_Pert_P.png", label: "XRD Diffractometer (PANalytical X'Pert Pro)" },
  { file: "08_Atomic_Force_Microscope__AFM_.png", label: "Atomic Force Microscope (AFM)" },
  { file: "09_Semiconductor_Parameter_Analyzer__Keithl.png", label: "Semiconductor Parameter Analyzer (Keithley)" },
  { file: "10_Source-Measure_Unit__Keithley_2600_.png", label: "Source-Measure Unit (Keithley 2600)" },
  { file: "11_Waveform_Generator__Keysight_33522B__30_.png", label: "Waveform Generator (Keysight 33522B, 30MHz)" },
  { file: "12_Digital_Oscilloscope__Keysight_DSOS054A_.png", label: "Digital Oscilloscope (Keysight DSOS054A)" },
  { file: "13_Dip-Coating___LbL_Robot__StratoSequence_.png", label: "Dip-Coating / LbL Robot (StratoSequence)" },
  { file: "14_O2_Plasma_Cleaner__Optrel_GBR__Multi-sto.png", label: "O₂ Plasma Cleaner (Optrel GBR, Multi-stop)" },
  { file: "15_Vacuum_Probe_Station__LTMP-4__MMR_Techno.png", label: "Vacuum Probe Station (LTMP-4, MMR Technologies)" },
];

function empty(): Instrument {
  return { code: "", name: "", supplierId: "", link: "", price: 0, quantity: 0, image: "", attachments: [] };
}

export default function Instruments() {
  const { state } = useStore();
  const actions = useInstrumentActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Instrument | null>(null);
  const [search, setSearch] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    fileRef: docRef,
    addFile: addDoc,
    removeFile: removeDoc,
  } = useAttachmentHelpers(editing?.attachments, (items) => {
    setEditing((prev) => (prev ? { ...prev, attachments: items } : prev));
  });

  const openAdd = () => {
    const firstPreset = PRESET_IMAGES[0];
    setEditing({
      ...empty(),
      image: `/assets/tools/${firstPreset.file}`,
    });
    setShowPresets(true);
    setModal(true);
  };

  const openEdit = (inst: Instrument) => {
    setEditing({ ...inst, attachments: inst.attachments ? [...inst.attachments] : [] });
    setShowPresets(false);
    setModal(true);
  };

  const selectPreset = (preset: { file: string; label: string }) => {
    setEditing((prev) => ({
      ...(prev || empty()),
      name: prev?.name || preset.label,
      image: `/assets/tools/${preset.file}`,
    }));
    setShowPresets(false);
  };

  const save = async () => {
    if (!editing) return;
    const i = { ...editing, code: editing.code.trim() || crypto.randomUUID().slice(0, 6) };
    if (!i.name.trim() || !i.supplierId) return;
    const exists = state.instruments.find((x) => x.code === i.code);
    if (exists) await actions.update(i);
    else await actions.add(i);
    setModal(false);
  };

  const del = async (code: string) => {
    if (confirm("Delete this instrument?")) await actions.remove(code);
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
      "instruments.xlsx",
      "Instruments",
      state.instruments.map((inst) => {
        const supplier = state.suppliers.find((s) => s.id === inst.supplierId);
        return {
          Code: inst.code,
          Name: inst.name,
          Supplier: supplier?.name ?? inst.supplierId,
          Link: inst.link,
          Price: inst.price,
          Quantity: inst.quantity,
          Documents: inst.attachments?.length ?? 0,
        };
      })
    );
  };

  const q = search.toLowerCase();
  const filtered = state.instruments.filter((inst) => {
    const s = state.suppliers.find((x) => x.id === inst.supplierId);
    const hay = [inst.code, inst.name, s?.name ?? "", inst.link].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Tools</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search instruments..." />
          </div>
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="card-grid">
          {filtered.map((inst) => {
            const supplier = state.suppliers.find((s) => s.id === inst.supplierId);
            return (
              <div className="card" key={inst.code}>
                <div className="card-image-box">
                  {inst.image ? <img src={inst.image} alt={inst.name} /> : <div className="card-image-placeholder"><ImageIcon size={28} /></div>}
                </div>
                <div className="card-body">
                  <div className="card-title-row">
                    <strong>{inst.name}</strong>
                    <span className="badge">Instrument</span>
                  </div>
                  <div className="card-meta">
                    <span><span className="mono-id">{inst.code}</span></span>
                    <span>Supplier: {supplier?.name ?? inst.supplierId}</span>
                    <span>Qty: {inst.quantity}</span>
                    <span>Price: ${inst.price.toFixed(2)}</span>
                  </div>
                  {inst.link && (
                    <a href={inst.link} target="_blank" rel="noreferrer" className="link">View product →</a>
                  )}
                  <AttachmentList items={inst.attachments} />
                </div>
                <div className="card-actions">
                  <button className="icon-btn" onClick={() => openEdit(inst)}><Pencil size={14} /></button>
                  <button className="icon-btn danger" onClick={() => del(inst.code)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty">No instruments match your search.</div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.instruments.find((x) => x.code === editing?.code) ? "Edit Instrument" : "New Instrument"}>
        <div className="form">
          {/* Preset image gallery */}
          {showPresets && (
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Choose a preset image</span>
                <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={() => setShowPresets(false)}>
                  Skip presets
                </button>
              </label>
              <div className="preset-grid">
                {PRESET_IMAGES.map((preset) => {
                  const selected = editing?.image === `/assets/tools/${preset.file}`;
                  return (
                    <div
                      key={preset.file}
                      className={`preset-card ${selected ? "preset-selected" : ""}`}
                      onClick={() => selectPreset(preset)}
                      title={preset.label}
                    >
                      <img src={`/assets/tools/${preset.file}`} alt={preset.label} loading="lazy" />
                      <div className="preset-label">{preset.label}</div>
                      {selected && <div className="preset-check"><Check size={14} /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="field"><label>Code</label><input value={editing?.code || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), code: e.target.value }))} placeholder="Auto-generated if empty" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), name: e.target.value }))} placeholder="e.g. Inverted Microscope" /></div>
          <div className="field"><label>Supplier</label><select value={editing?.supplierId || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), supplierId: e.target.value }))}><option value="">Select supplier...</option>{state.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></div>
          <div className="field"><label>Link</label><input value={editing?.link || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), link: e.target.value }))} placeholder="https://..." /></div>
          <div className="row">
            <div className="field"><label>Price ($)</label><input type="number" step={0.01} value={editing?.price ?? 0} onChange={(e) => setEditing((p) => ({ ...(p || empty()), price: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="field"><label>Quantity</label><input type="number" value={editing?.quantity ?? 0} onChange={(e) => setEditing((p) => ({ ...(p || empty()), quantity: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div className="field">
            <label>Image</label>
            <div className="image-upload">
              {editing?.image ? <img src={editing.image} alt="preview" className="image-preview" /> : <div className="image-preview-placeholder"><ImageIcon size={24} /></div>}
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>{editing?.image ? "Change image" : "Upload image"}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowPresets(true)}>Presets</button>
              </div>
            </div>
          </div>
          <div className="field"><label>Documents</label><AttachmentList items={editing?.attachments} editable onRemove={removeDoc} /><AttachmentUploader fileRef={docRef} onChange={addDoc} /></div>
          <div className="form-actions"><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}
