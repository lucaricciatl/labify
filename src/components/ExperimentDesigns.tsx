import React, { useState, useRef } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Copy,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  FileDown,
  ChevronDown,
  ChevronUp,
  X,
  FileType2,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { useStore, useExperimentDesignActions } from "../store";
import type { ExperimentDesign, DesignStep, Attachment } from "../types";
import { generateId } from "../utils";
import Modal from "./Modal";
import { downloadExperimentDesignWord, downloadExperimentDesignPDF, downloadDesignBOM } from "../export";
import { useAttachmentHelpers, AttachmentList, AttachmentUploader } from "./Attachments";

function emptyStep(order: number): DesignStep {
  return {
    id: generateId(),
    order,
    title: "",
    description: "",
    durationMinutes: undefined,
    safetyNotes: "",
    expectedResult: "",
    image: "",
    materials: [],
    instruments: [],
  };
}

function emptyDesign(): ExperimentDesign {
  return {
    id: generateId(),
    name: "",
    objective: "",
    hypothesis: "",
    materials: [],
    instruments: [],
    steps: [emptyStep(0)],
    conclusion: "",
    attachments: [],
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

function deriveDesignMaterials(steps: DesignStep[]): string[] {
  const set = new Set<string>();
  for (const s of steps) {
    for (const m of s.materials ?? []) set.add(m);
  }
  return Array.from(set);
}

function deriveDesignInstruments(steps: DesignStep[]): string[] {
  const set = new Set<string>();
  for (const s of steps) {
    for (const i of s.instruments ?? []) set.add(i);
  }
  return Array.from(set);
}

function generateDesignId(designs: ExperimentDesign[]): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `DES-${yyyy}${mm}${dd}-`;
  let max = 0;
  for (const d of designs) {
    if (d.id.startsWith(prefix)) {
      const num = parseInt(d.id.replace(prefix, ""), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export default function ExperimentDesigns() {
  const { state } = useStore();
  const actions = useExperimentDesignActions();
  const [modal, setModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<ExperimentDesign | null>(null);
  const [editing, setEditing] = useState<ExperimentDesign | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<ExperimentDesign | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeImageStep, setActiveImageStep] = useState<{ idx: number; type: "planned" | "actual" } | null>(null);
  const { fileRef: attachFileRef, addFile, removeFile } = useAttachmentHelpers(
    editing?.attachments || [],
    (items: Attachment[]) => setEditing((p) => p ? { ...p, attachments: items } : p)
  );

  const duplicate = async (d: ExperimentDesign) => {
    const nextId = generateDesignId(state.experimentDesigns);
    const copied: ExperimentDesign = {
      ...d,
      id: nextId,
      name: `${d.name} (Copy)`,
      materials: [...d.materials],
      instruments: [...d.instruments],
      steps: d.steps.map((s) => ({
        ...s,
        id: generateId(),
        materials: [...(s.materials ?? [])],
        instruments: [...(s.instruments ?? [])],
      })),
      attachments: d.attachments?.map((a) => ({ ...a, id: generateId() })) ?? [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    await actions.add(copied);
  };

  const openAdd = () => {
    try {
      const nextId = generateDesignId(state.experimentDesigns);
      setEditing({ ...emptyDesign(), id: nextId });
      setModal(true);
    } catch (err) {
      console.error("[ExperimentDesigns] openAdd failed:", err);
      alert("Failed to create new design. See console for details.");
    }
  };

  const openEdit = (d: ExperimentDesign) => {
    setEditing({
      ...d,
      materials: [...d.materials],
      instruments: [...d.instruments],
      steps: d.steps.map((s) => ({
        ...s,
        materials: [...(s.materials ?? [])],
        instruments: [...(s.instruments ?? [])],
      })),
    });
    setModal(true);
  };

  const openPreview = (d: ExperimentDesign) => {
    setPreviewDesign(d);
    setPreviewModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const d = {
      ...editing,
      updatedAt: new Date().toISOString().slice(0, 10),
      steps: editing.steps.map((s, i) => ({ ...s, order: i })),
      materials: deriveDesignMaterials(editing.steps),
      instruments: deriveDesignInstruments(editing.steps),
    };
    if (!d.name.trim()) {
      alert("Please enter a name for the design.");
      return;
    }
    try {
      const exists = state.experimentDesigns.find((x) => x.id === d.id);
      if (exists) await actions.update(d);
      else await actions.add(d);
      setModal(false);
    } catch (err) {
      console.error("[ExperimentDesigns] save failed:", err);
      alert("Failed to save design. See console for details.");
    }
  };

  const del = async (id: string) => {
    if (confirm("Delete this experiment design?")) await actions.remove(id);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const addStep = () => {
    if (!editing) return;
    setEditing({ ...editing, steps: [...editing.steps, emptyStep(editing.steps.length)] });
  };

  const updateStep = (i: number, patch: Partial<DesignStep>) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[i] = { ...steps[i], ...patch };
    setEditing({ ...editing, steps });
  };

  const removeStep = (i: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps.splice(i, 1);
    setEditing({ ...editing, steps });
  };

  const moveStep = (i: number, dir: -1 | 1) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setEditing({ ...editing, steps });
  };

  const addStepMaterial = (stepIdx: number, code: string) => {
    if (!editing || !code) return;
    const steps = [...editing.steps];
    const step = { ...steps[stepIdx] };
    if ((step.materials ?? []).includes(code)) return;
    step.materials = [...(step.materials ?? []), code];
    steps[stepIdx] = step;
    setEditing({ ...editing, steps });
  };

  const removeStepMaterial = (stepIdx: number, matIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const step = { ...steps[stepIdx] };
    step.materials = (step.materials ?? []).filter((_, i) => i !== matIdx);
    steps[stepIdx] = step;
    setEditing({ ...editing, steps });
  };

  const addStepInstrument = (stepIdx: number, code: string) => {
    if (!editing || !code) return;
    const steps = [...editing.steps];
    const step = { ...steps[stepIdx] };
    if ((step.instruments ?? []).includes(code)) return;
    step.instruments = [...(step.instruments ?? []), code];
    steps[stepIdx] = step;
    setEditing({ ...editing, steps });
  };

  const removeStepInstrument = (stepIdx: number, instIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const step = { ...steps[stepIdx] };
    step.instruments = (step.instruments ?? []).filter((_, i) => i !== instIdx);
    steps[stepIdx] = step;
    setEditing({ ...editing, steps });
  };

  const onImageChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateStep(i, { image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const exportWord = async (d: ExperimentDesign) => {
    await downloadExperimentDesignWord(d, state.experiments);
  };

  const exportPdf = async (d: ExperimentDesign) => {
    setPrintTarget(d);
    await new Promise((r) => setTimeout(r, 150));
    await downloadExperimentDesignPDF(d, printRef);
    setPrintTarget(null);
  };

  const exportBom = (d: ExperimentDesign) => {
    const matEnriched = state.materials.map((m) => {
      const s = state.suppliers.find((x) => x.id === m.supplierId);
      return { code: m.code, name: m.name, supplierName: s?.name ?? m.supplierId, price: m.price, unit: m.unit };
    });
    const instEnriched = state.instruments.map((inst) => {
      const s = state.suppliers.find((x) => x.id === inst.supplierId);
      return { code: inst.code, name: inst.name, supplierName: s?.name ?? inst.supplierId, price: inst.price };
    });
    downloadDesignBOM(d, matEnriched, instEnriched);
  };

  const q = search.toLowerCase();
  const filtered = state.experimentDesigns.filter((d) => {
    const hay = [d.id, d.name, d.objective || "", d.hypothesis || "", ...d.steps.map((s) => s.title + " " + s.description)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Experiment Designs</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search designs..." />
          </div>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Name</th>
              <th>Steps</th>
              <th>Updated</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const isOpen = expanded.has(d.id);
              return (
                <React.Fragment key={d.id}>
                  <tr className="exp-row">
                    <td>
                      <button className="icon-btn" onClick={() => toggleExpand(d.id)}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td><span className="mono-id">{d.id}</span></td>
                    <td>{d.name}</td>
                    <td>{d.steps.length} step(s)</td>
                    <td>{d.updatedAt || d.createdAt}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(d)}><Pencil size={14} /></button>
                      <button className="icon-btn" title="Duplicate" onClick={() => duplicate(d)}><Copy size={14} /></button>
                      <button className="icon-btn" title="Preview" onClick={() => openPreview(d)}><Eye size={14} /></button>
                      <button className="icon-btn" title="Export Word" onClick={() => exportWord(d)}><FileType2 size={14} /></button>
                      <button className="icon-btn" title="Export PDF" onClick={() => exportPdf(d)}><FileDown size={14} /></button>
                      <button className="icon-btn" title="Export BOM" onClick={() => exportBom(d)}><FileSpreadsheet size={14} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => del(d.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="exp-detail">
                      <td colSpan={6}>
                        <div className="design-preview-container">
                          {d.objective && <p style={{ marginBottom: 8, color: "#37474F", fontSize: 13 }}><strong style={{ color: "#0D9488" }}>Objective:</strong> {d.objective}</p>}
                          {d.hypothesis && <p style={{ marginBottom: 12, color: "#37474F", fontSize: 13 }}><strong style={{ color: "#0D9488" }}>Hypothesis:</strong> {d.hypothesis}</p>}
                          <div className="subtable-box">
                            <strong style={{ color: "#0D9488", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.8px" }}>Steps</strong>
                            <div className="step-preview-list">
                              {d.steps.map((step, idx) => (
                                <div className="step-preview" key={step.id}>
                                  <div className="step-preview-header">
                                    <span className="step-number">{idx + 1}</span>
                                    <div style={{ flex: 1 }}>
                                      <strong style={{ fontSize: 13, color: "#263238" }}>{step.title}</strong>
                                      {step.durationMinutes && <span className="step-meta"><Clock size={12} /> {step.durationMinutes} min</span>}
                                    </div>
                                  </div>
                                  <div className="step-preview-body">
                                    <p className="step-desc">{step.description}</p>
                                    {step.safetyNotes && (
                                      <div className="step-safety"><AlertTriangle size={12} /> {step.safetyNotes}</div>
                                    )}
                                    {step.expectedResult && (
                                      <div className="step-expected"><strong>Expected:</strong> {step.expectedResult}</div>
                                    )}
                                    {step.image && <img src={step.image} alt="planned" className="step-image" />}
                                    {(step.materials?.length || step.instruments?.length) ? (
                                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {step.materials?.map((code) => {
                                          const mat = state.materials.find((m) => m.code === code);
                                          return <span key={code} style={{ fontSize: 10, background: "#E0F2F1", padding: "2px 8px", borderRadius: 10, color: "#0D9488" }}>{mat?.name || code}</span>;
                                        })}
                                        {step.instruments?.map((code) => {
                                          const inst = state.instruments.find((i) => i.code === code);
                                          return <span key={code} style={{ fontSize: 10, background: "#E3F2FD", padding: "2px 8px", borderRadius: 10, color: "#1565C0" }}>{inst?.name || code}</span>;
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {d.conclusion && (
                            <div className="conclusion-card">
                              <strong>Conclusion:</strong> {d.conclusion}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="empty">No experiment designs match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.experimentDesigns.find((x) => x.id === editing?.id) ? "Edit Design" : "New Experiment Design"}>
        <div className="form">
          <div className="field"><label>Design ID</label><input value={editing?.id || ""} readOnly className="mono-input" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Ti3C2Tx MXene Device Fabrication Protocol" /></div>
          <div className="field"><label>Objective</label><textarea value={editing?.objective || ""} onChange={(e) => setEditing((p) => p ? { ...p, objective: e.target.value } : p)} rows={2} placeholder="What is the goal of this experiment?" /></div>
          <div className="field"><label>Hypothesis</label><textarea value={editing?.hypothesis || ""} onChange={(e) => setEditing((p) => p ? { ...p, hypothesis: e.target.value } : p)} rows={2} placeholder="What do you expect to observe?" /></div>

          <div className="field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Steps</span>
              <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={addStep}>
                <Plus size={12} /> Add step
              </button>
            </label>
            <div className="sub-form-list procedure-steps">
              {editing?.steps.map((step, i) => (
                <div className="step-card" key={step.id}>
                  <div className="step-card-header">
                    <span className="step-number">{i + 1}</span>
                    <div className="step-move-btns">
                      <button className="icon-btn" disabled={i === 0} onClick={() => moveStep(i, -1)}><ArrowUp size={12} /></button>
                      <button className="icon-btn" disabled={i === (editing?.steps.length ?? 0) - 1} onClick={() => moveStep(i, 1)}><ArrowDown size={12} /></button>
                    </div>
                    <button className="icon-btn danger" onClick={() => removeStep(i)}><Trash2 size={12} /></button>
                  </div>
                  <input placeholder="Step title" value={step.title} onChange={(e) => updateStep(i, { title: e.target.value })} style={{ marginBottom: 6 }} />
                  <textarea placeholder="Description" value={step.description} onChange={(e) => updateStep(i, { description: e.target.value })} rows={2} style={{ marginBottom: 6 }} />
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <input type="number" min={0} placeholder="Duration (min)" value={step.durationMinutes ?? ""} onChange={(e) => updateStep(i, { durationMinutes: e.target.value ? parseInt(e.target.value) : undefined })} />
                    </div>
                    <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                      <input placeholder="Safety notes" value={step.safetyNotes || ""} onChange={(e) => updateStep(i, { safetyNotes: e.target.value })} />
                    </div>
                  </div>
                  <input placeholder="Expected result" value={step.expectedResult || ""} onChange={(e) => updateStep(i, { expectedResult: e.target.value })} style={{ marginTop: 6 }} />

                  {/* Planned image */}
                  <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
                    <label style={{ fontSize: "11px" }}>Planned / Reference Image</label>
                    <div className="image-upload" style={{ gap: "0.5rem" }}>
                      {step.image ? (
                        <div style={{ position: "relative" }}>
                          <img src={step.image} alt="planned" className="image-preview" style={{ maxHeight: 100 }} />
                          <button className="icon-btn danger" style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)" }} onClick={() => updateStep(i, { image: "" })}><X size={12} color="#fff" /></button>
                        </div>
                      ) : (
                        <div className="image-preview-placeholder"><ImageIcon size={20} /></div>
                      )}
                      <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => { setActiveImageStep({ idx: i, type: "planned" }); fileRef.current?.click(); }}>
                        {step.image ? "Change" : "Upload"}
                      </button>
                    </div>
                  </div>

                  {/* Materials & Instruments lists */}
                  <div className="field" style={{ marginTop: 10 }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#0D9488" }}>Required Materials</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {(step.materials ?? []).map((code, mi) => {
                        const mat = state.materials.find((m) => m.code === code);
                        return (
                          <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2F1", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#0D9488" }}>
                            {mat?.name || code}
                            <button className="icon-btn" style={{ width: 16, height: 16 }} onClick={() => removeStepMaterial(i, mi)}><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                    <select value="" onChange={(e) => addStepMaterial(i, e.target.value)} style={{ marginTop: 6 }}>
                      <option value="">+ Add material...</option>
                      {state.materials.filter((m) => !(step.materials ?? []).includes(m.code)).map((m) => (
                        <option key={m.code} value={m.code}>{m.code} — {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field" style={{ marginTop: 10 }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#0D9488" }}>Required Instruments</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {(step.instruments ?? []).map((code, ii) => {
                        const inst = state.instruments.find((inst) => inst.code === code);
                        return (
                          <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2F1", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#0D9488" }}>
                            {inst?.name || code}
                            <button className="icon-btn" style={{ width: 16, height: 16 }} onClick={() => removeStepInstrument(i, ii)}><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                    <select value="" onChange={(e) => addStepInstrument(i, e.target.value)} style={{ marginTop: 6 }}>
                      <option value="">+ Add instrument...</option>
                      {state.instruments.filter((inst) => !(step.instruments ?? []).includes(inst.code)).map((inst) => (
                        <option key={inst.code} value={inst.code}>{inst.code} — {inst.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#0D9488" }}>Complete Materials & Instruments</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {deriveDesignMaterials(editing?.steps ?? []).map((code) => {
                const mat = state.materials.find((m) => m.code === code);
                return (
                  <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2F1", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#0D9488" }}>
                    {mat?.name || code}
                  </span>
                );
              })}
              {deriveDesignInstruments(editing?.steps ?? []).map((code) => {
                const inst = state.instruments.find((i) => i.code === code);
                return (
                  <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E3F2FD", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#1565C0" }}>
                    {inst?.name || code}
                  </span>
                );
              })}
            </div>
            {(deriveDesignMaterials(editing?.steps ?? []).length === 0 && deriveDesignInstruments(editing?.steps ?? []).length === 0) && (
              <div style={{ fontSize: 12, color: "#78909C", marginTop: 4 }}>Add materials and instruments to individual steps to build the complete list.</div>
            )}
          </div>

          <div className="field"><label>Expected Conclusion</label><textarea value={editing?.conclusion || ""} onChange={(e) => setEditing((p) => p ? { ...p, conclusion: e.target.value } : p)} rows={2} placeholder="What conclusion do you expect from this experiment?" /></div>

          <div className="field">
            <label>Documents & Attachments</label>
            <AttachmentList items={editing?.attachments} onRemove={removeFile} editable />
            <AttachmentUploader fileRef={attachFileRef} onChange={addFile} label="Add document" />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </Modal>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
        if (activeImageStep) {
          onImageChange(activeImageStep.idx, e);
          setActiveImageStep(null);
        }
      }} />

      {/* Hidden print target for PDF — ReportLab-style with color accents */}
      {printTarget && (
        <div style={{ position: "absolute", left: "-9999px", top: 0, width: 595 }}>
          <div
            ref={printRef}
            style={{
              width: 595,
              padding: "40px 48px",
              background: "#FFFFFF",
              color: "#212121",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            {/* Teal header bar */}
            <div data-pdf-section style={{ height: 4, background: "#0D9488", borderRadius: 2, marginBottom: 20 }}></div>

            {/* Protocol header */}
            <div data-pdf-section style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>
                Experiment Design Protocol
              </div>
              <h1 style={{ margin: "0 0 10px 0", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{printTarget.name}</h1>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 9, color: "#455A64" }}>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>ID</span><div>{printTarget.id}</div></div>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Created</span><div>{printTarget.createdAt || "—"}</div></div>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Updated</span><div>{printTarget.updatedAt || "—"}</div></div>
              </div>
            </div>

            {/* Objective */}
            {printTarget.objective && (
              <div data-pdf-section style={{ marginBottom: 16, padding: "10px 14px", background: "#F0FDFA", borderLeft: "3px solid #0D9488", borderRadius: "0 6px 6px 0" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>Objective</div>
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: "#37474F" }}>{printTarget.objective}</p>
              </div>
            )}

            {/* Hypothesis */}
            {printTarget.hypothesis && (
              <div data-pdf-section style={{ marginBottom: 16, padding: "10px 14px", background: "#F0FDFA", borderLeft: "3px solid #0D9488", borderRadius: "0 6px 6px 0" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>Hypothesis</div>
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: "#37474F" }}>{printTarget.hypothesis}</p>
              </div>
            )}

            {/* Materials table */}
            {printTarget.materials.length > 0 && (
              <div data-pdf-section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 6 }}>Materials</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: "#0D9488" }}>
                      {["Code", "Name", "Qty", "Unit"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: 8, letterSpacing: "0.5px", color: "#fff" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printTarget.materials.map((code) => {
                      const mat = state.materials.find((m) => m.code === code);
                      return (
                        <tr key={code} style={{ borderBottom: "1px solid #E0E0E0", background: "#FAFAFA" }}>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#0D9488", fontWeight: 600 }}>{code}</td>
                          <td style={{ padding: "5px 8px", color: "#37474F" }}>{mat?.name || "—"}</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>—</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>{mat?.unit || ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Instruments table */}
            {printTarget.instruments.length > 0 && (
              <div data-pdf-section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 6 }}>Instruments</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: "#0D9488" }}>
                      {["Code", "Name", "Qty"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: 8, letterSpacing: "0.5px", color: "#fff" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printTarget.instruments.map((code) => {
                      const inst = state.instruments.find((i) => i.code === code);
                      return (
                        <tr key={code} style={{ borderBottom: "1px solid #E0E0E0", background: "#FAFAFA" }}>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#0D9488", fontWeight: 600 }}>{code}</td>
                          <td style={{ padding: "5px 8px", color: "#37474F" }}>{inst?.name || "—"}</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Procedure Steps */}
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 12 }}>Procedure Steps</div>

              {printTarget.steps.map((step, idx) => (
                <div
                  key={step.id}
                  data-pdf-section
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    background: "#FAFAFA",
                    borderLeft: "3px solid #0D9488",
                    borderRadius: "0 8px 8px 0",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0D9488", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#263238" }}>{step.title}</div>
                  </div>
                  {step.durationMinutes && (
                    <div style={{ fontSize: 9, color: "#78909C", marginBottom: 4, marginLeft: 30 }}>Duration: {step.durationMinutes} min</div>
                  )}
                  <p style={{ margin: "0 0 6px 30px", fontSize: 10, lineHeight: 1.55, color: "#546E7A" }}>{step.description}</p>

                  {((step.materials ?? []).length > 0 || (step.instruments ?? []).length > 0) && (
                    <div style={{ fontSize: 9, marginBottom: 4, marginLeft: 30 }}>
                      {(step.materials ?? []).length > 0 && (
                        <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Materials:</span> <span style={{ color: "#455A64" }}>{(step.materials ?? []).join(", ")}</span></div>
                      )}
                      {(step.instruments ?? []).length > 0 && (
                        <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Instruments:</span> <span style={{ color: "#455A64" }}>{(step.instruments ?? []).join(", ")}</span></div>
                      )}
                    </div>
                  )}

                  {step.safetyNotes && (
                    <div style={{ fontSize: 9, marginBottom: 4, marginLeft: 30, padding: "4px 8px", background: "#FFF3E0", borderRadius: 4, color: "#E65100" }}><span style={{ fontWeight: 700 }}>⚠ {step.safetyNotes}</span></div>
                  )}

                  {step.expectedResult && (
                    <div style={{ fontSize: 9, marginBottom: 2, marginLeft: 30 }}>
                      <span style={{ fontWeight: 700, color: "#0D9488" }}>Expected result:</span> <span style={{ color: "#455A64" }}>{step.expectedResult}</span>
                    </div>
                  )}

                  {step.image && <img src={step.image} alt="planned" style={{ marginLeft: 30, maxWidth: 280, maxHeight: 180, borderRadius: 6, border: "1px solid #E0E0E0", marginTop: 6 }} />}
                </div>
              ))}
            </div>

            {/* Conclusion */}
            {printTarget.conclusion && (
              <div data-pdf-section style={{ marginTop: 20, marginBottom: 16, padding: "10px 14px", background: "#F0FDFA", borderLeft: "3px solid #0D9488", borderRadius: "0 6px 6px 0" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>Conclusion</div>
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: "#37474F" }}>{printTarget.conclusion}</p>
              </div>
            )}

            {/* Footer */}
            <div
              data-pdf-section
              style={{
                textAlign: "center",
                paddingTop: 16,
                borderTop: "1px solid #E0E0E0",
                fontSize: 8,
                color: "#90A4AE",
              }}
            >
              Generated from Labify experiment design API · {printTarget.id}
            </div>
          </div>
        </div>
      )}
      {/* Preview Modal */}
      <Modal open={previewModal} onClose={() => setPreviewModal(false)} title="Document Preview">
        {previewDesign && (
          <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "8px 4px" }}>
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "32px 40px", border: "1px solid #E0E0E0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ borderBottom: "2px solid #0D9488", paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#0D9488", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Experiment Design Protocol</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Montserrat', system-ui, sans-serif" }}>{previewDesign.name}</h1>
                <div style={{ marginTop: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div><span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>ID</span><div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{previewDesign.id}</div></div>
                  <div><span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>Date</span><div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{previewDesign.updatedAt || previewDesign.createdAt}</div></div>
                </div>
              </div>

              {(previewDesign.objective || previewDesign.hypothesis) && (
                <div style={{ marginBottom: 20 }}>
                  {previewDesign.objective && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Objective</div>
                      <p style={{ margin: 0, fontSize: 12.5, color: "#37474F", lineHeight: 1.6 }}>{previewDesign.objective}</p>
                    </div>
                  )}
                  {previewDesign.hypothesis && (
                    <div>
                      <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Hypothesis</div>
                      <p style={{ margin: 0, fontSize: 12.5, color: "#37474F", lineHeight: 1.6 }}>{previewDesign.hypothesis}</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Procedure Steps</div>
              <div className="step-preview-list">
                {previewDesign.steps.map((step, idx) => (
                  <div className="step-preview" key={step.id}>
                    <div className="step-preview-header">
                      <span className="step-number">{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13, color: "#263238" }}>{step.title}</strong>
                        {step.durationMinutes && <span className="step-meta"><Clock size={12} /> {step.durationMinutes} min</span>}
                      </div>
                    </div>
                    <div className="step-preview-body">
                      <p className="step-desc">{step.description}</p>
                      {step.safetyNotes && (
                        <div className="step-safety"><AlertTriangle size={12} /> {step.safetyNotes}</div>
                      )}
                      {step.expectedResult && (
                        <div className="step-expected"><strong>Expected:</strong> {step.expectedResult}</div>
                      )}
                      {step.image && <img src={step.image} alt="planned" className="step-image" />}
                      {(step.materials?.length || step.instruments?.length) ? (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {step.materials?.map((code) => {
                            const mat = state.materials.find((m) => m.code === code);
                            return <span key={code} style={{ fontSize: 10, background: "#E0F2F1", padding: "2px 8px", borderRadius: 10, color: "#0D9488" }}>{mat?.name || code}</span>;
                          })}
                          {step.instruments?.map((code) => {
                            const inst = state.instruments.find((i) => i.code === code);
                            return <span key={code} style={{ fontSize: 10, background: "#E3F2FD", padding: "2px 8px", borderRadius: 10, color: "#1565C0" }}>{inst?.name || code}</span>;
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {previewDesign.conclusion && (
                <div className="conclusion-card" style={{ marginTop: 20 }}>
                  <strong>Conclusion:</strong> {previewDesign.conclusion}
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #ECEFF1", fontSize: 10, color: "#90A4AE" }}>
                Generated by Labify · {previewDesign.steps.length} steps
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
