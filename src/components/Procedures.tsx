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
  Printer,
  FileDown,
  ChevronDown,
  ChevronUp,
  X,
  FlaskConical,
} from "lucide-react";
import { useStore, useProcedureActions } from "../store";
import type { Procedure, ProcedureStep } from "../types";
import Modal from "./Modal";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function emptyStep(order: number): ProcedureStep {
  return {
    id: crypto.randomUUID(),
    order,
    title: "",
    description: "",
    durationMinutes: undefined,
    safetyNotes: "",
    image: "",
  };
}

function emptyProcedure(): Procedure {
  return {
    id: crypto.randomUUID(),
    name: "",
    experimentId: "",
    description: "",
    steps: [emptyStep(0)],
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

function generateProcedureId(procedures: Procedure[]): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `PROC-${yyyy}${mm}${dd}-`;
  let max = 0;
  for (const p of procedures) {
    if (p.id.startsWith(prefix)) {
      const num = parseInt(p.id.replace(prefix, ""), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export default function Procedures() {
  const { state } = useStore();
  const actions = useProcedureActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<Procedure | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const openAdd = () => {
    const nextId = generateProcedureId(state.procedures);
    setEditing({ ...emptyProcedure(), id: nextId });
    setModal(true);
  };

  const openEdit = (p: Procedure) => {
    setEditing({ ...p, steps: p.steps.map((s) => ({ ...s })) });
    setModal(true);
  };

  const save = async () => {
    if (!editing) return;
    const p = {
      ...editing,
      updatedAt: new Date().toISOString().slice(0, 10),
      steps: editing.steps.map((s, i) => ({ ...s, order: i })),
    };
    if (!p.name.trim()) return;
    const exists = state.procedures.find((x) => x.id === p.id);
    if (exists) await actions.update(p);
    else await actions.add(p);
    setModal(false);
  };

  const del = async (id: string) => {
    if (confirm("Delete this procedure?")) await actions.remove(id);
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
    setEditing({
      ...editing,
      steps: [...editing.steps, emptyStep(editing.steps.length)],
    });
  };

  const updateStep = (i: number, patch: Partial<ProcedureStep>) => {
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

  const onStepImageChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateStep(i, { image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const exportPdf = async (p: Procedure) => {
    setPrintTarget(p);
    await new Promise((r) => setTimeout(r, 100));
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg") || "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    pdf.save(`${p.id}_${p.name.replace(/\s+/g, "_")}.pdf`);
    setPrintTarget(null);
  };

  const q = search.toLowerCase();
  const filtered = state.procedures.filter((p) => {
    const hay = [p.id, p.name, p.description || "", ...p.steps.map((s) => s.title + " " + s.description)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Procedures</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search procedures..." />
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
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isOpen = expanded.has(p.id);
              const linkedExp = state.experiments.find((e) => e.id === p.experimentId);
              return (
                <React.Fragment key={p.id}>
                  <tr className="exp-row">
                    <td>
                      <button className="icon-btn" onClick={() => toggleExpand(p.id)}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td><span className="mono-id">{p.id}</span></td>
                    <td>{p.name}</td>
                    <td>{linkedExp?.name || "—"}</td>
                    <td>{p.steps.length} step(s)</td>
                    <td>{p.updatedAt || p.createdAt}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                      <button className="icon-btn" title="Export PDF" onClick={() => exportPdf(p)}><FileDown size={14} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => del(p.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="exp-detail">
                      <td colSpan={7}>
                        <div className="exp-detail-box">
                          {p.description && <p style={{ marginBottom: 12, opacity: 0.8 }}>{p.description}</p>}
                          <div className="subtable-box">
                            <strong>Steps</strong>
                            <div className="step-preview-list">
                              {p.steps.map((step, idx) => (
                                <div className="step-preview" key={step.id}>
                                  <div className="step-preview-header">
                                    <span className="step-number">{idx + 1}</span>
                                    <strong>{step.title}</strong>
                                    {step.durationMinutes && (
                                      <span className="step-meta"><Clock size={12} /> {step.durationMinutes} min</span>
                                    )}
                                  </div>
                                  <p className="step-desc">{step.description}</p>
                                  {step.safetyNotes && (
                                    <div className="step-safety">
                                      <AlertTriangle size={12} /> {step.safetyNotes}
                                    </div>
                                  )}
                                  {step.image && <img src={step.image} alt={step.title} className="step-image" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="empty">No procedures match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.procedures.find((x) => x.id === editing?.id) ? "Edit Procedure" : "New Procedure"}>
        <div className="form">
          <div className="field"><label>Procedure ID</label><input value={editing?.id || ""} readOnly className="mono-input" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Ti3C2Tx MXene Etching Protocol" /></div>
          <div className="field">
            <label>Linked Experiment (optional)</label>
            <select value={editing?.experimentId || ""} onChange={(e) => setEditing((p) => p ? { ...p, experimentId: e.target.value } : p)}>
              <option value="">— None —</option>
              {state.experiments.map((e) => (
                <option key={e.id} value={e.id}>{e.id} — {e.name}</option>
              ))}
            </select>
          </div>
          <div className="field"><label>Description</label><textarea value={editing?.description || ""} onChange={(e) => setEditing((p) => p ? { ...p, description: e.target.value } : p)} rows={2} placeholder="Short overview of the protocol..." /></div>

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
                  <input
                    placeholder="Step title"
                    value={step.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    style={{ marginBottom: 6 }}
                  />
                  <textarea
                    placeholder="Description"
                    value={step.description}
                    onChange={(e) => updateStep(i, { description: e.target.value })}
                    rows={3}
                    style={{ marginBottom: 6 }}
                  />
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="Duration (min)"
                        value={step.durationMinutes ?? ""}
                        onChange={(e) => updateStep(i, { durationMinutes: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                      <input
                        placeholder="Safety notes"
                        value={step.safetyNotes || ""}
                        onChange={(e) => updateStep(i, { safetyNotes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
                    <div className="image-upload" style={{ gap: "0.5rem" }}>
                      {step.image ? (
                        <div style={{ position: "relative" }}>
                          <img src={step.image} alt="preview" className="image-preview" style={{ maxHeight: 120 }} />
                          <button className="icon-btn danger" style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)" }} onClick={() => updateStep(i, { image: "" })}><X size={12} color="#fff" /></button>
                        </div>
                      ) : (
                        <div className="image-preview-placeholder"><ImageIcon size={20} /></div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onStepImageChange(i, e)} style={{ display: "none" }} />
                      <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => fileRef.current?.click()}>
                        {step.image ? "Change image" : "Upload image"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </Modal>

      {/* Hidden print target for PDF export */}
      {printTarget && (
        <div style={{ position: "absolute", left: "-9999px", top: 0, width: 800 }}>
          <div ref={printRef} className="procedure-print" style={{ padding: 24, background: "#fff", color: "#1a1a1a", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ borderBottom: "2px solid #0D9488", paddingBottom: 12, marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0D9488" }}>{printTarget.name}</h1>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                ID: {printTarget.id} {printTarget.experimentId && `| Linked: ${state.experiments.find((e) => e.id === printTarget.experimentId)?.name || printTarget.experimentId}`}
              </div>
            </div>
            {printTarget.description && <p style={{ marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>{printTarget.description}</p>}
            {printTarget.steps.map((step, idx) => (
              <div key={step.id} style={{ marginBottom: 24, pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ background: "#0D9488", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>
                  <strong style={{ fontSize: 14 }}>{step.title}</strong>
                  {step.durationMinutes && <span style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>⏱ {step.durationMinutes} min</span>}
                </div>
                <p style={{ marginLeft: 32, marginBottom: 8, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{step.description}</p>
                {step.safetyNotes && (
                  <div style={{ marginLeft: 32, background: "#FEF3C7", borderLeft: "3px solid #F59E0B", padding: "6px 10px", fontSize: 11, borderRadius: 4, marginBottom: 8 }}>
                    ⚠️ {step.safetyNotes}
                  </div>
                )}
                {step.image && <img src={step.image} alt={step.title} style={{ marginLeft: 32, maxWidth: 400, maxHeight: 280, borderRadius: 6, border: "1px solid #eee" }} />}
              </div>
            ))}
            <div style={{ marginTop: 30, borderTop: "1px solid #eee", paddingTop: 10, fontSize: 10, color: "#999" }}>
              Generated by Labify on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
