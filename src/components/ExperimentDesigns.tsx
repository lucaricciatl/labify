import React, { useState, useRef } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  FileText,
  Search,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  FileDown,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Circle,
  FileType2,
} from "lucide-react";
import { useStore, useExperimentDesignActions } from "../store";
import type { ExperimentDesign, DesignStep } from "../types";
import Modal from "./Modal";
import { downloadExperimentDesignWord, downloadExperimentDesignPDF } from "../export";

function emptyStep(order: number): DesignStep {
  return {
    id: crypto.randomUUID(),
    order,
    title: "",
    description: "",
    durationMinutes: undefined,
    safetyNotes: "",
    expectedResult: "",
    image: "",
    actualResult: "",
    deviationNotes: "",
    actualImage: "",
    completed: false,
  };
}

function emptyDesign(): ExperimentDesign {
  return {
    id: crypto.randomUUID(),
    name: "",
    experimentId: "",
    objective: "",
    hypothesis: "",
    materials: [],
    instruments: [],
    steps: [emptyStep(0)],
    conclusion: "",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
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
  const [editing, setEditing] = useState<ExperimentDesign | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<ExperimentDesign | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeImageStep, setActiveImageStep] = useState<{ idx: number; type: "planned" | "actual" } | null>(null);

  const openAdd = () => {
    const nextId = generateDesignId(state.experimentDesigns);
    setEditing({ ...emptyDesign(), id: nextId });
    setModal(true);
  };

  const openEdit = (d: ExperimentDesign) => {
    setEditing({
      ...d,
      materials: [...d.materials],
      instruments: [...d.instruments],
      steps: d.steps.map((s) => ({ ...s })),
    });
    setModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const d = {
      ...editing,
      updatedAt: new Date().toISOString().slice(0, 10),
      steps: editing.steps.map((s, i) => ({ ...s, order: i })),
    };
    if (!d.name.trim()) return;
    const exists = state.experimentDesigns.find((x) => x.id === d.id);
    if (exists) await actions.update(d);
    else await actions.add(d);
    setModal(false);
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

  const onImageChange = (i: number, type: "planned" | "actual", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateStep(i, type === "planned" ? { image: reader.result as string } : { actualImage: reader.result as string });
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
              <th>Experiment</th>
              <th>Steps</th>
              <th>Updated</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const isOpen = expanded.has(d.id);
              const linkedExp = state.experiments.find((e) => e.id === d.experimentId);
              const completedSteps = d.steps.filter((s) => s.completed).length;
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
                    <td>{linkedExp?.name || "—"}</td>
                    <td>{completedSteps}/{d.steps.length} done</td>
                    <td>{d.updatedAt || d.createdAt}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(d)}><Pencil size={14} /></button>
                      <button className="icon-btn" title="Export Word" onClick={() => exportWord(d)}><FileType2 size={14} /></button>
                      <button className="icon-btn" title="Export PDF" onClick={() => exportPdf(d)}><FileDown size={14} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => del(d.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="exp-detail">
                      <td colSpan={7}>
                        <div className="exp-detail-box">
                          {d.objective && <p style={{ marginBottom: 8, opacity: 0.8 }}><strong>Objective:</strong> {d.objective}</p>}
                          {d.hypothesis && <p style={{ marginBottom: 12, opacity: 0.8 }}><strong>Hypothesis:</strong> {d.hypothesis}</p>}
                          <div className="subtable-box">
                            <strong>Steps</strong>
                            <div className="step-preview-list">
                              {d.steps.map((step, idx) => (
                                <div className={`step-preview ${step.completed ? "step-completed" : ""}`} key={step.id}>
                                  <div className="step-preview-header">
                                    <span className="step-number">{idx + 1}</span>
                                    <strong>{step.title}</strong>
                                    {step.durationMinutes && <span className="step-meta"><Clock size={12} /> {step.durationMinutes} min</span>}
                                    {step.completed ? <CheckCircle2 size={14} color="var(--accent)" /> : <Circle size={14} color="#ccc" />}
                                  </div>
                                  <p className="step-desc">{step.description}</p>
                                  {step.safetyNotes && (
                                    <div className="step-safety"><AlertTriangle size={12} /> {step.safetyNotes}</div>
                                  )}
                                  {step.expectedResult && (
                                    <div className="step-expected"><strong>Expected:</strong> {step.expectedResult}</div>
                                  )}
                                  {step.image && <img src={step.image} alt="planned" className="step-image" />}
                                  {(step.actualResult || step.deviationNotes || step.actualImage) && (
                                    <div className="step-actual-box">
                                      <strong>Execution / Deviation</strong>
                                      {step.actualResult && <p>{step.actualResult}</p>}
                                      {step.deviationNotes && <div className="step-deviation">⚠️ {step.deviationNotes}</div>}
                                      {step.actualImage && <img src={step.actualImage} alt="actual" className="step-image" />}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          {d.conclusion && (
                            <div className="cost-summary" style={{ marginTop: 12 }}>
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
              <tr><td colSpan={7} className="empty">No experiment designs match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.experimentDesigns.find((x) => x.id === editing?.id) ? "Edit Design" : "New Experiment Design"}>
        <div className="form">
          <div className="field"><label>Design ID</label><input value={editing?.id || ""} readOnly className="mono-input" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Ti3C2Tx MXene Device Fabrication Protocol" /></div>
          <div className="field">
            <label>Linked Experiment (optional)</label>
            <select value={editing?.experimentId || ""} onChange={(e) => setEditing((p) => p ? { ...p, experimentId: e.target.value } : p)}>
              <option value="">— None —</option>
              {state.experiments.map((e) => (
                <option key={e.id} value={e.id}>{e.id} — {e.name}</option>
              ))}
            </select>
          </div>
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

                  {/* Actual execution / deviation */}
                  <div style={{ marginTop: 10, padding: 10, background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: "12px", color: "var(--text-h)", textTransform: "uppercase", letterSpacing: "0.3px" }}>Execution &amp; Deviation</strong>
                    <input placeholder="Actual result observed" value={step.actualResult || ""} onChange={(e) => updateStep(i, { actualResult: e.target.value })} style={{ marginTop: 6, marginBottom: 6 }} />
                    <textarea placeholder="Deviation from standard procedure / notes" value={step.deviationNotes || ""} onChange={(e) => updateStep(i, { deviationNotes: e.target.value })} rows={2} style={{ marginBottom: 6 }} />
                    <label className="checkbox-field" style={{ marginBottom: 6 }}>
                      <input type="checkbox" checked={step.completed} onChange={(e) => updateStep(i, { completed: e.target.checked })} />
                      <label>Step completed</label>
                    </label>
                    <div className="image-upload" style={{ gap: "0.5rem" }}>
                      {step.actualImage ? (
                        <div style={{ position: "relative" }}>
                          <img src={step.actualImage} alt="actual" className="image-preview" style={{ maxHeight: 100 }} />
                          <button className="icon-btn danger" style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)" }} onClick={() => updateStep(i, { actualImage: "" })}><X size={12} color="#fff" /></button>
                        </div>
                      ) : (
                        <div className="image-preview-placeholder"><ImageIcon size={20} /></div>
                      )}
                      <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => { setActiveImageStep({ idx: i, type: "actual" }); fileRef.current?.click(); }}>
                        {step.actualImage ? "Change" : "Upload actual photo"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="field"><label>Conclusion</label><textarea value={editing?.conclusion || ""} onChange={(e) => setEditing((p) => p ? { ...p, conclusion: e.target.value } : p)} rows={2} placeholder="Summary of results and next steps..." /></div>

          <div className="form-actions">
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </Modal>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
        if (activeImageStep) {
          onImageChange(activeImageStep.idx, activeImageStep.type, e);
          setActiveImageStep(null);
        }
      }} />

      {/* Hidden print target for PDF */}
      {printTarget && (
        <div style={{ position: "absolute", left: "-9999px", top: 0, width: 800 }}>
          <div ref={printRef} style={{ padding: 24, background: "#fff", color: "#1a1a1a", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ borderBottom: "2px solid #0D9488", paddingBottom: 12, marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0D9488" }}>{printTarget.name}</h1>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>ID: {printTarget.id}</div>
            </div>
            {printTarget.objective && <p style={{ marginBottom: 12, fontSize: 13 }}><strong>Objective:</strong> {printTarget.objective}</p>}
            {printTarget.hypothesis && <p style={{ marginBottom: 16, fontSize: 13 }}><strong>Hypothesis:</strong> {printTarget.hypothesis}</p>}
            {printTarget.steps.map((step, idx) => (
              <div key={step.id} style={{ marginBottom: 24, pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ background: step.completed ? "#0D9488" : "#ccc", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>
                  <strong style={{ fontSize: 14 }}>{step.title}</strong>
                  {step.durationMinutes && <span style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>⏱ {step.durationMinutes} min</span>}
                </div>
                <p style={{ marginLeft: 32, marginBottom: 8, fontSize: 12, lineHeight: 1.6 }}>{step.description}</p>
                {step.expectedResult && <p style={{ marginLeft: 32, marginBottom: 8, fontSize: 12, color: "#0D9488" }}><strong>Expected:</strong> {step.expectedResult}</p>}
                {step.image && <img src={step.image} alt="planned" style={{ marginLeft: 32, maxWidth: 350, maxHeight: 250, borderRadius: 6, border: "1px solid #eee", marginBottom: 8 }} />}
                {(step.actualResult || step.deviationNotes || step.actualImage) && (
                  <div style={{ marginLeft: 32, background: "#FEF3C7", borderLeft: "3px solid #F59E0B", padding: "8px 12px", borderRadius: 4 }}>
                    <strong style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Execution &amp; Deviation</strong>
                    {step.actualResult && <p style={{ fontSize: 12, margin: "0 0 4px" }}>{step.actualResult}</p>}
                    {step.deviationNotes && <p style={{ fontSize: 11, margin: 0, color: "#92400E" }}>⚠️ {step.deviationNotes}</p>}
                    {step.actualImage && <img src={step.actualImage} alt="actual" style={{ maxWidth: 300, maxHeight: 220, borderRadius: 6, border: "1px solid #eee", marginTop: 6 }} />}
                  </div>
                )}
              </div>
            ))}
            {printTarget.conclusion && <p style={{ marginTop: 20, fontSize: 13, borderTop: "1px solid #eee", paddingTop: 12 }}><strong>Conclusion:</strong> {printTarget.conclusion}</p>}
            <div style={{ marginTop: 30, borderTop: "1px solid #eee", paddingTop: 10, fontSize: 10, color: "#999" }}>
              Generated by Labify on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
