import React, { useState, useRef } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, FileSpreadsheet, FileText, ExternalLink, Link2, Search, ShoppingCart, Copy, X, Eye, FileDown, AlertTriangle } from "lucide-react";
import { useStore, useExperimentActions, generateExperimentId, useOrderActions } from "../store";
import type { Experiment, ExperimentMaterial, ExperimentInstrument, DocumentLink, ExperimentStep } from "../types";
import { generateId } from "../utils";
import Modal from "./Modal";
import { downloadExcel, downloadExperimentPDF } from "../export";
import { AttachmentList, AttachmentUploader, useAttachmentHelpers } from "./Attachments";

function empty(): Experiment {
  return { id: "", name: "", designId: "", materials: [], instruments: [], steps: [], startingDate: "", endingDate: "", conclusion: "", docLinks: [], attachments: [] };
}

function incrementLastNumber(name: string): string {
  const matches = [...name.matchAll(/\d+/g)];
  if (matches.length === 0) return `${name} 2`;
  const lastMatch = matches[matches.length - 1];
  const numStr = lastMatch[0];
  const num = parseInt(numStr, 10);
  const nextNumStr = String(num + 1).padStart(numStr.length, "0");
  const start = lastMatch.index!;
  const end = start + numStr.length;
  return name.slice(0, start) + nextNumStr + name.slice(end);
}

function incrementLastNumberInId(id: string, existingIds: string[]): string {
  const matches = [...id.matchAll(/\d+/g)];
  if (matches.length === 0) return id;

  const lastMatch = matches[matches.length - 1];
  const numStr = lastMatch[0];
  const start = lastMatch.index!;
  const end = start + numStr.length;
  const prefix = id.slice(0, start);
  const suffix = id.slice(end);

  let num = parseInt(numStr, 10);
  let nextId: string;
  do {
    num++;
    const nextNumStr = String(num).padStart(numStr.length, "0");
    nextId = prefix + nextNumStr + suffix;
  } while (existingIds.includes(nextId));

  return nextId;
}

function calculateCost(exp: Experiment, materials: { code: string; price: number }[], instruments: { code: string; price: number }[]): number {
  let cost = 0;
  for (const em of exp.materials) {
    const mat = materials.find((m) => m.code === em.materialCode);
    cost += (mat?.price ?? 0) * em.quantityNeeded;
  }
  for (const ei of exp.instruments) {
    const inst = instruments.find((i) => i.code === ei.instrumentCode);
    cost += (inst?.price ?? 0) * ei.quantityNeeded;
  }
  return cost;
}

export default function Experiments() {
  const { state } = useStore();
  const actions = useExperimentActions();
  const orderActions = useOrderActions();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Experiment | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [quickOrder, setQuickOrder] = useState<{ materialCode: string; qty: number; batch: string } | null>(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [previewExp, setPreviewExp] = useState<Experiment | null>(null);
  const [printTarget, setPrintTarget] = useState<Experiment | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const {
    fileRef: docRef,
    addFile: addDocFile,
    removeFile: removeDocFile,
  } = useAttachmentHelpers(editing?.attachments, (items) => {
    setEditing((prev) => (prev ? { ...prev, attachments: items } : prev));
  });

  const stepImageRef = useRef<HTMLInputElement>(null);
  const [activeStepImage, setActiveStepImage] = useState<number | null>(null);
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);

  const openAdd = () => {
    const nextId = generateExperimentId(state.experiments);
    setEditingStepIdx(null);
    setEditing({ ...empty(), id: nextId });
    setModal(true);
  };

  const openEdit = (e: Experiment) => {
    setEditingStepIdx(null);
    setEditing({
      ...e,
      docLinks: e.docLinks ? [...e.docLinks] : [],
      attachments: e.attachments ? [...e.attachments] : [],
      steps: e.steps.map((s) => ({
        ...s,
        actualImages: s.actualImages?.length ? [...s.actualImages] : s.actualImage ? [s.actualImage] : [],
      })),
    });
    setModal(true);
  };

  const duplicate = async (e: Experiment) => {
    const existingIds = state.experiments.map((ex) => ex.id);
    const newId = incrementLastNumberInId(e.id, existingIds);
    const newName = incrementLastNumber(e.name);
    const clone: Experiment = {
      ...e,
      id: newId,
      name: newName,
      steps: e.steps ? e.steps.map((s) => ({
        ...s,
        id: generateId(),
        completed: false,
        actualResult: "",
        deviationNotes: "",
        actualImage: "",
        actualImages: [],
      })) : [],
      docLinks: e.docLinks ? e.docLinks.map((dl) => ({ ...dl, id: generateId() })) : [],
      attachments: e.attachments ? e.attachments.map((att) => ({ ...att, id: generateId() })) : [],
    };
    await actions.add(clone);
  };

  const save = async () => {
    if (!editing) return;
    const e = { ...editing };
    if (!e.id.trim()) e.id = generateExperimentId(state.experiments);
    if (!e.name.trim()) return;
    const exists = state.experiments.find((x) => x.id === e.id);
    if (exists) await actions.update(e);
    else await actions.add(e);
    setModal(false);
  };

  const del = async (id: string) => {
    if (confirm("Delete this experiment?")) await actions.remove(id);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const addMat = () => {
    if (!editing) return;
    setEditing({ ...editing, materials: [...editing.materials, { materialCode: "", quantityNeeded: 1, unit: "" }] });
  };

  const updateMat = (i: number, val: ExperimentMaterial) => {
    if (!editing) return;
    const mats = [...editing.materials];
    mats[i] = val;
    setEditing({ ...editing, materials: mats });
  };

  const removeMat = (i: number) => {
    if (!editing) return;
    const mats = [...editing.materials];
    mats.splice(i, 1);
    setEditing({ ...editing, materials: mats });
  };

  const addInst = () => {
    if (!editing) return;
    setEditing({ ...editing, instruments: [...editing.instruments, { instrumentCode: "", quantityNeeded: 1 }] });
  };

  const updateInst = (i: number, val: ExperimentInstrument) => {
    if (!editing) return;
    const insts = [...editing.instruments];
    insts[i] = val;
    setEditing({ ...editing, instruments: insts });
  };

  const removeInst = (i: number) => {
    if (!editing) return;
    const insts = [...editing.instruments];
    insts.splice(i, 1);
    setEditing({ ...editing, instruments: insts });
  };

  const addDocLink = () => {
    if (!editing) return;
    const newLink: DocumentLink = { id: generateId(), label: "", url: "" };
    setEditing({ ...editing, docLinks: [...(editing.docLinks || []), newLink] });
  };

  const updateDocLink = (i: number, patch: Partial<DocumentLink>) => {
    if (!editing) return;
    const links = [...(editing.docLinks || [])];
    links[i] = { ...links[i], ...patch };
    setEditing({ ...editing, docLinks: links });
  };

  const removeDocLink = (i: number) => {
    if (!editing) return;
    const links = [...(editing.docLinks || [])];
    links.splice(i, 1);
    setEditing({ ...editing, docLinks: links });
  };

  const loadFromDesign = (designId: string) => {
    if (!editing) return;
    const design = state.experimentDesigns.find((d) => d.id === designId);
    if (!design) return;
    const steps: ExperimentStep[] = design.steps.map((s) => ({
      id: generateId(),
      order: s.order,
      title: s.title,
      description: s.description,
      durationMinutes: s.durationMinutes,
      safetyNotes: s.safetyNotes,
      expectedResult: s.expectedResult,
      image: s.image,
      images: s.images ?? (s.image ? [s.image] : []),
      actualResult: "",
      deviationNotes: "",
      actualImage: "",
      actualImages: [],
      completed: false,
    }));
    setEditing({
      ...editing,
      designId,
      name: editing.name || design.name,
      materials: design.materials.map((code) => {
        const mat = state.materials.find((m) => m.code === code);
        return { materialCode: code, quantityNeeded: 1, unit: mat?.unit || "" };
      }),
      instruments: design.instruments.map((code) => ({ instrumentCode: code, quantityNeeded: 1 })),
      steps,
    });
  };

  const updateStep = (i: number, patch: Partial<ExperimentStep>) => {
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

  const addStep = () => {
    if (!editing) return;
    const newStep: ExperimentStep = {
      id: generateId(),
      order: editing.steps.length + 1,
      title: "",
      description: "",
      actualResult: "",
      deviationNotes: "",
      actualImage: "",
      actualImages: [],
      completed: false,
    };
    setEditing({ ...editing, steps: [...editing.steps, newStep] });
    setEditingStepIdx(editing.steps.length);
  };

  const onStepImageChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const steps = [...(editing?.steps ?? [])];
    const newImages: string[] = [];
    let loaded = 0;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        loaded++;
        if (loaded === files.length) {
          steps[i] = { ...steps[i], actualImages: [...(steps[i].actualImages ?? []), ...newImages] };
          setEditing((p) => p ? { ...p, steps } : p);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeStepActualImage = (stepIdx: number, imgIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = { ...steps[stepIdx], actualImages: (steps[stepIdx].actualImages ?? []).filter((_, i) => i !== imgIdx) };
    setEditing({ ...editing, steps });
  };

  const exportAll = () => {
    downloadExcel(
      "experiments.xlsx",
      "Experiments",
      state.experiments.map((e) => ({
        ID: e.id,
        Name: e.name,
        "Start Date": e.startingDate,
        "End Date": e.endingDate,
        Materials: e.materials.length,
        Instruments: e.instruments.length,
        "Doc Links": e.docLinks?.map((d) => d.label).join(", ") || "",
        Attachments: e.attachments?.length ?? 0,
        "Est. Cost": calculateCost(e, state.materials, state.instruments),
      }))
    );
  };

  const openPreview = (exp: Experiment) => {
    setPreviewExp(exp);
    setPreviewModal(true);
  };

  const exportPdf = async (exp: Experiment) => {
    setPrintTarget(exp);
    setTimeout(async () => {
      await downloadExperimentPDF(exp, printRef);
      setPrintTarget(null);
    }, 100);
  };

  const q = search.toLowerCase();
  const filtered = state.experiments.filter((exp) => {
    const hay = [exp.id, exp.name, exp.startingDate, exp.endingDate, ...exp.materials.map((m) => m.materialCode), ...exp.instruments.map((i) => i.instrumentCode)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const doQuickOrder = async () => {
    if (!quickOrder) return;
    const mat = state.materials.find((m) => m.code === quickOrder.materialCode);
    if (!mat) return;
    await orderActions.add({
      id: generateId(),
      materialCode: quickOrder.materialCode,
      supplierId: mat.supplierId,
      quantity: quickOrder.qty,
      unitPrice: mat.price,
      batch: quickOrder.batch,
      orderedDate: new Date().toISOString().slice(0, 10),
    });
    setQuickOrder(null);
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>Experiments</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search experiments..." />
          </div>
          <button className="btn-ghost" onClick={exportAll}><FileSpreadsheet size={16} /> Export</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table experiment-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Items</th>
              <th>Est. Cost</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((exp) => {
              const isOpen = expanded.has(exp.id);
              const cost = calculateCost(exp, state.materials, state.instruments);
              return (
                <React.Fragment key={exp.id}>
                  <tr className="exp-row">
                    <td>
                      <button className="icon-btn" onClick={() => toggleExpand(exp.id)}>
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td><span className="mono-id">{exp.id}</span></td>
                    <td>{exp.name}</td>
                    <td>{exp.startingDate}</td>
                    <td>{exp.endingDate}</td>
                    <td>{exp.materials.length + exp.instruments.length} item(s)</td>
                    <td><strong>${cost.toFixed(2)}</strong></td>
                    <td className="actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(exp)}><Pencil size={14} /></button>
                      <button className="icon-btn" title="Duplicate experiment" onClick={() => duplicate(exp)}><Copy size={14} /></button>
                      <button className="icon-btn" title="Preview" onClick={() => openPreview(exp)}><Eye size={14} /></button>
                      <button className="icon-btn" title="Export PDF" onClick={() => exportPdf(exp)}><FileDown size={14} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => del(exp.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="exp-detail">
                      <td colSpan={8}>
                        <div className="exp-detail-box">
                          <div className="subtable-box">
                            <strong>Materials Used</strong>
                            <table className="subtable">
                              <thead>
                                <tr>
                                  <th>Code</th>
                                  <th>Name</th>
                                  <th>Supplier</th>
                                  <th>Qty Needed</th>
                                  <th>Unit Price</th>
                                  <th style={{ width: 40 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {exp.materials.map((em) => {
                                  const mat = state.materials.find((m) => m.code === em.materialCode);
                                  const supplier = state.suppliers.find((s) => s.id === mat?.supplierId);
                                  return (
                                    <React.Fragment key={em.materialCode}>
                                      <tr>
                                        <td><span className="mono-id">{em.materialCode}</span></td>
                                        <td>{mat?.name ?? "-"}</td>
                                        <td>{supplier?.name || supplier?.webpage || "-"}</td>
                                        <td>{em.quantityNeeded} {em.unit || mat?.unit || ""}</td>
                                        <td>{mat ? `$${mat.price.toFixed(2)}` : "-"}</td>
                                        <td className="actions">
                                          <button
                                            className="icon-btn"
                                            title="Add to order"
                                            onClick={() => setQuickOrder({ materialCode: em.materialCode, qty: em.quantityNeeded, batch: "" })}
                                          >
                                            <ShoppingCart size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                      {quickOrder?.materialCode === em.materialCode && (
                                        <tr className="quick-order-row">
                                          <td colSpan={6}>
                                            <div className="quick-order-box">
                                              <span>Add {mat?.name ?? em.materialCode} to orders:</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={quickOrder.qty}
                                                onChange={(e) => setQuickOrder((qo) => qo ? { ...qo, qty: parseInt(e.target.value) || 1 } : null)}
                                                placeholder="Qty"
                                                style={{ width: 70 }}
                                              />
                                              <input
                                                value={quickOrder.batch}
                                                onChange={(e) => setQuickOrder((qo) => qo ? { ...qo, batch: e.target.value } : null)}
                                                placeholder="Batch"
                                                style={{ width: 120 }}
                                              />
                                              <button className="btn-primary" onClick={doQuickOrder}>Order</button>
                                              <button className="btn-ghost" onClick={() => setQuickOrder(null)}>Cancel</button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                {exp.materials.length === 0 && (
                                  <tr><td colSpan={6} className="empty">No materials assigned.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="subtable-box">
                            <strong>Instruments Used</strong>
                            <table className="subtable">
                              <thead>
                                <tr>
                                  <th>Code</th>
                                  <th>Name</th>
                                  <th>Supplier</th>
                                  <th>Qty Needed</th>
                                  <th>Unit Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exp.instruments.map((ei) => {
                                  const inst = state.instruments.find((i) => i.code === ei.instrumentCode);
                                  const supplier = state.suppliers.find((s) => s.id === inst?.supplierId);
                                  return (
                                    <tr key={ei.instrumentCode}>
                                      <td><span className="mono-id">{ei.instrumentCode}</span></td>
                                      <td>{inst?.name ?? "-"}</td>
                                      <td>{supplier?.name || supplier?.webpage || "-"}</td>
                                      <td>{ei.quantityNeeded}</td>
                                      <td>{inst ? `$${inst.price.toFixed(2)}` : "-"}</td>
                                    </tr>
                                  );
                                })}
                                {exp.instruments.length === 0 && (
                                  <tr><td colSpan={5} className="empty">No instruments assigned.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!!exp.steps?.length && (
                            <div className="subtable-box">
                              <strong>Procedure Steps</strong>
                              <div className="step-preview-list">
                                {exp.steps.map((step, idx) => (
                                  <div className={`step-preview ${step.completed ? "step-completed" : ""}`} key={step.id}>
                                    <div className="step-preview-header">
                                      <span className="step-number">{idx + 1}</span>
                                      <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: 13, color: "#263238" }}>{step.title}</strong>
                                        {step.durationMinutes && <span className="step-meta">⏱ {step.durationMinutes} min</span>}
                                      </div>
                                      <span className={`step-check ${step.completed ? "checked" : ""}`} aria-label={step.completed ? "Completed" : "Pending"}>
                                        {step.completed ? "✓" : ""}
                                      </span>
                                      <span className={`step-status-badge ${step.completed ? "completed" : "pending"}`}>
                                        {step.completed ? "Completed" : "Pending"}
                                      </span>
                                    </div>
                                    <div className="step-preview-body">
                                      <p className="step-desc">{step.description}</p>
                                      {step.expectedResult && (
                                        <div className="step-expected"><strong>Expected:</strong> {step.expectedResult}</div>
                                      )}
                                      {step.image && <img src={step.image} alt="planned" className="step-image" />}
                                      {(step.images ?? []).map((img, imgIdx) => <img key={imgIdx} src={img} alt={`planned-${imgIdx}`} className="step-image" style={{ marginTop: 4 }} />)}
                                      {(step.actualResult || step.deviationNotes || step.actualImage || (step.actualImages ?? []).length > 0) && (
                                        <div className="step-actual-box">
                                          <div className="actual-header">📝 Execution &amp; Deviation Record</div>
                                          <div className="actual-body">
                                            {step.actualResult && <p>{step.actualResult}</p>}
                                            {step.deviationNotes && (
                                              <div className="step-deviation">
                                                <span className="deviation-icon">⚠️</span>
                                                <span>{step.deviationNotes}</span>
                                              </div>
                                            )}
                                            {step.actualImage && <img src={step.actualImage} alt="actual" className="actual-image" />}
                                            {(step.actualImages ?? []).map((img, imgIdx) => <img key={imgIdx} src={img} alt={`actual-${imgIdx}`} className="actual-image" style={{ marginTop: 4 }} />)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {exp.conclusion && (
                            <div className="conclusion-card">
                              <strong>Conclusion:</strong> {exp.conclusion}
                            </div>
                          )}

                          <div className="cost-summary">
                            <strong>Estimated Total Cost: ${cost.toFixed(2)}</strong>
                          </div>

                          {!!exp.docLinks?.length && (
                            <div className="subtable-box">
                              <strong>Linked Documents</strong>
                              <div className="doclink-grid">
                                {exp.docLinks.map((dl) => (
                                  <a key={dl.id} href={dl.url} target="_blank" rel="noreferrer" className="doclink-card">
                                    <Link2 size={15} />
                                    <span>{dl.label || dl.url}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {!!exp.attachments?.length && (
                            <div className="subtable-box">
                              <strong>Attached Files</strong>
                              <div className="exp-docs">
                                {exp.attachments.map((att) => (
                                  <a key={att.id} href={att.data || "#"} download={att.name}>
                                    <FileText size={13} /> {att.name}
                                  </a>
                                ))}
                              </div>
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
              <tr><td colSpan={8} className="empty">No experiments match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={state.experiments.find((x) => x.id === editing?.id) ? "Edit Experiment" : "New Experiment"}>
        <div className="form">
          <div className="field"><label>Experiment ID</label><input value={editing?.id || ""} readOnly placeholder="Auto-generated" className="mono-input" /></div>
          <div className="field"><label>Name</label><input value={editing?.name || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), name: e.target.value }))} /></div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Protocol / Design</span>
              {editing?.designId && (
                <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={() => editing && loadFromDesign(editing.designId || "")}>
                  Reload steps from design
                </button>
              )}
            </label>
            <select value={editing?.designId || ""} onChange={(e) => { const id = e.target.value; setEditing((p) => p ? { ...p, designId: id } : p); if (id) loadFromDesign(id); }}>
              <option value="">— No design —</option>
              {state.experimentDesigns.map((d) => (
                <option key={d.id} value={d.id}>{d.id} — {d.name}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="field"><label>Start Date</label><input type="date" value={editing?.startingDate || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), startingDate: e.target.value }))} /></div>
            <div className="field"><label>End Date</label><input type="date" value={editing?.endingDate || ""} onChange={(e) => setEditing((p) => ({ ...(p || empty()), endingDate: e.target.value }))} /></div>
          </div>
          <div className="field">
            <label>Materials</label>
            <div className="sub-form-list">
              {editing?.materials.map((m, i) => (
                <div className="sub-form-row material-row" key={i}>
                  <select
                    value={m.materialCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const mat = state.materials.find((x) => x.code === code);
                      updateMat(i, { materialCode: code, quantityNeeded: m.quantityNeeded, unit: mat?.unit || "" });
                    }}
                  >
                    <option value="">Select material...</option>
                    {state.materials.map((mat) => (
                      <option key={mat.code} value={mat.code}>{mat.code} — {mat.name}</option>
                    ))}
                  </select>
                  <div className="mat-row-controls">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={m.quantityNeeded}
                      onChange={(e) => updateMat(i, { materialCode: m.materialCode, quantityNeeded: parseFloat(e.target.value) || 1, unit: m.unit })}
                      placeholder="Qty"
                    />
                    <input
                      className="unit-input"
                      value={m.unit || ""}
                      onChange={(e) => updateMat(i, { materialCode: m.materialCode, quantityNeeded: m.quantityNeeded, unit: e.target.value })}
                      placeholder="unit"
                    />
                    <button className="icon-btn danger" onClick={() => removeMat(i)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={addMat}><Plus size={14} /> Add material</button>
            </div>
          </div>
          <div className="field">
            <label>Instruments</label>
            <div className="sub-form-list">
              {editing?.instruments.map((inst, i) => (
                <div className="sub-form-row" key={i}>
                  <select value={inst.instrumentCode} onChange={(e) => updateInst(i, { instrumentCode: e.target.value, quantityNeeded: inst.quantityNeeded })}>
                    <option value="">Select instrument...</option>
                    {state.instruments.map((instrument) => (
                      <option key={instrument.code} value={instrument.code}>{instrument.code} — {instrument.name}</option>
                    ))}
                  </select>
                  <input type="number" min={1} value={inst.quantityNeeded} onChange={(e) => updateInst(i, { instrumentCode: inst.instrumentCode, quantityNeeded: parseInt(e.target.value) || 1 })} placeholder="Qty" />
                  <button className="icon-btn danger" onClick={() => removeInst(i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={addInst}><Plus size={14} /> Add instrument</button>
            </div>
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Procedure Steps</span>
              <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={addStep}>
                <Plus size={12} /> Add step
              </button>
            </label>

            {editingStepIdx === null && (
              <div className="sub-form-list">
                {editing?.steps.length === 0 && <div style={{ fontSize: 12, color: "#78909C", padding: "12px 0" }}>Select a design above to load steps, or add them manually.</div>}
                {editing?.steps.map((step, i) => (
                  <div
                    key={step.id}
                    onClick={() => setEditingStepIdx(i)}
                    style={{
                      cursor: "pointer",
                      padding: "10px 14px",
                      background: "#FAFAFA",
                      borderRadius: 8,
                      borderLeft: step.completed ? "3px solid #0D9488" : "3px solid #E0E0E0",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: step.completed ? "#0D9488" : "#B0BEC5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#263238", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.title || "Untitled step"}</div>
                      <div style={{ fontSize: 11, color: "#78909C", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {step.durationMinutes && <span>⏱ {step.durationMinutes} min</span>}
                        {(step.actualImages ?? []).length > 0 && <span>📷 {(step.actualImages ?? []).length}</span>}
                        {step.completed && <span style={{ color: "#0D9488" }}>✓ Completed</span>}
                      </div>
                      {step.actualResult && (
                        <div style={{ fontSize: 11, color: "#546E7A", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.actualResult}</div>
                      )}
                    </div>
                    <button
                      className="icon-btn danger"
                      style={{ flexShrink: 0 }}
                      onClick={(e) => { e.stopPropagation(); removeStep(i); }}
                      title="Delete step"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {editingStepIdx !== null && editing?.steps[editingStepIdx] && (
              <div className="sub-form-list">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => setEditingStepIdx(null)}>
                    ← Back to list
                  </button>
                  <div style={{ fontSize: 12, color: "#78909C" }}>Step {editingStepIdx + 1} of {editing.steps.length}</div>
                </div>

                {(() => {
                  const i = editingStepIdx;
                  const step = editing.steps[i];
                  return (
                    <div className="step-card" key={step.id}>
                      <div className="step-card-header">
                        <span className="step-number">{i + 1}</span>
                        <strong style={{ fontSize: 12 }}>{step.title}</strong>
                        <button className="icon-btn danger" onClick={() => { removeStep(i); setEditingStepIdx(null); }}><Trash2 size={12} /></button>
                      </div>
                      {step.description && <p style={{ fontSize: 11, color: "#78909C", margin: "0 0 8px" }}>{step.description}</p>}
                      {step.expectedResult && <p style={{ fontSize: 11, color: "#0D9488", margin: "0 0 8px" }}><strong>Expected:</strong> {step.expectedResult}</p>}

                      <div className="field" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: "10px", color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Actual Result</label>
                        <input value={step.actualResult || ""} onChange={(e) => updateStep(i, { actualResult: e.target.value })} placeholder="What was observed..." />
                      </div>

                      <div className="field" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: "10px", color: "#C62828", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Deviation / Notes</label>
                        <textarea value={step.deviationNotes || ""} onChange={(e) => updateStep(i, { deviationNotes: e.target.value })} rows={4} placeholder="Any deviation from protocol..." />
                      </div>

                      <label className="checkbox-field" style={{ marginBottom: 8 }}>
                        <input type="checkbox" checked={step.completed} onChange={(e) => updateStep(i, { completed: e.target.checked })} />
                        <span>Step completed</span>
                      </label>

                      {/* Actual images */}
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: "11px" }}>Actual Photos</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                          {(step.actualImages ?? []).map((img, imgIdx) => (
                            <div key={imgIdx} style={{ position: "relative" }}>
                              <img src={img} alt={`actual-${imgIdx}`} className="image-preview" style={{ maxHeight: 80, borderRadius: 6, border: "1px solid #E0E0E0" }} />
                              <button
                                className="icon-btn danger"
                                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)" }}
                                onClick={() => removeStepActualImage(i, imgIdx)}
                                title="Remove photo"
                              >
                                <X size={12} color="#fff" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", alignSelf: "flex-start" }}
                            onClick={() => { setActiveStepImage(i); stepImageRef.current?.click(); }}
                          >
                            {(step.actualImages ?? []).length > 0 ? "+ Add more photos" : "Upload photos"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="field"><label>Conclusion</label><textarea value={editing?.conclusion || ""} onChange={(e) => setEditing((p) => p ? { ...p, conclusion: e.target.value } : p)} rows={2} placeholder="Summary of results and findings..." /></div>
          <div className="field">
            <label>Document Links</label>
            <div className="sub-form-list">
              {editing?.docLinks?.map((dl, i) => (
                <div className="sub-form-row doclink-row" key={dl.id}>
                  <input placeholder="Label (e.g. SOP-001)" value={dl.label} onChange={(e) => updateDocLink(i, { label: e.target.value })} />
                  <input placeholder="https://..." value={dl.url} onChange={(e) => updateDocLink(i, { url: e.target.value })} />
                  <button className="icon-btn danger" onClick={() => removeDocLink(i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={addDocLink}><Link2 size={14} /> Add link</button>
            </div>
          </div>
          <div className="field"><label>File Attachments</label><AttachmentList items={editing?.attachments} editable onRemove={removeDocFile} /><AttachmentUploader fileRef={docRef} onChange={addDocFile} /></div>
          <div className="form-actions"><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
      </Modal>
      <input ref={stepImageRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => {
        if (activeStepImage !== null) {
          onStepImageChange(activeStepImage, e);
          setActiveStepImage(null);
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

            {/* Report header */}
            <div data-pdf-section style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>
                Experiment Execution Report
              </div>
              <h1 style={{ margin: "0 0 10px 0", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{printTarget.name}</h1>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 9, color: "#455A64" }}>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>ID</span><div>{printTarget.id}</div></div>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Start</span><div>{printTarget.startingDate || "—"}</div></div>
                <div><span style={{ fontWeight: 700, color: "#0D9488" }}>End</span><div>{printTarget.endingDate || "—"}</div></div>
                {printTarget.designId && (
                  <div><span style={{ fontWeight: 700, color: "#0D9488" }}>Protocol</span><div>{state.experimentDesigns.find((d) => d.id === printTarget.designId)?.name || printTarget.designId}</div></div>
                )}
              </div>
            </div>

            {/* Materials table */}
            {printTarget.materials.length > 0 && (
              <div data-pdf-section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 6 }}>Materials Used</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: "#0D9488" }}>
                      {["Code", "Name", "Qty Needed", "Unit"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: 8, letterSpacing: "0.5px", color: "#fff" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printTarget.materials.map((em) => {
                      const mat = state.materials.find((m) => m.code === em.materialCode);
                      return (
                        <tr key={em.materialCode} style={{ borderBottom: "1px solid #E0E0E0", background: "#FAFAFA" }}>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#0D9488", fontWeight: 600 }}>{em.materialCode}</td>
                          <td style={{ padding: "5px 8px", color: "#37474F" }}>{mat?.name || "—"}</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>{em.quantityNeeded}</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>{em.unit || mat?.unit || ""}</td>
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
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 6 }}>Instruments Used</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: "#0D9488" }}>
                      {["Code", "Name", "Qty Needed"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: 8, letterSpacing: "0.5px", color: "#fff" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printTarget.instruments.map((ei) => {
                      const inst = state.instruments.find((i) => i.code === ei.instrumentCode);
                      return (
                        <tr key={ei.instrumentCode} style={{ borderBottom: "1px solid #E0E0E0", background: "#FAFAFA" }}>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#0D9488", fontWeight: 600 }}>{ei.instrumentCode}</td>
                          <td style={{ padding: "5px 8px", color: "#37474F" }}>{inst?.name || "—"}</td>
                          <td style={{ padding: "5px 8px", color: "#78909C" }}>{ei.quantityNeeded}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Procedure Steps */}
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#0D9488", marginBottom: 12 }}>Procedure Steps — Execution Record</div>

              {printTarget.steps.map((step, idx) => (
                <div
                  key={step.id}
                  data-pdf-section
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    background: "#FAFAFA",
                    borderLeft: step.completed ? "3px solid #0D9488" : "3px solid #CFD8DC",
                    borderRadius: "0 8px 8px 0",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: step.completed ? "#0D9488" : "#CFD8DC", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#263238" }}>{step.title}</div>
                    </div>
                    {step.completed ? (
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: "#0D9488", padding: "2px 8px", borderRadius: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Completed</span>
                    ) : (
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#78909C", background: "#ECEFF1", padding: "2px 8px", borderRadius: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</span>
                    )}
                  </div>
                  {step.durationMinutes && (
                    <div style={{ fontSize: 9, color: "#78909C", marginBottom: 4, marginLeft: 30 }}>Duration: {step.durationMinutes} min</div>
                  )}
                  <p style={{ margin: "0 0 6px 30px", fontSize: 10, lineHeight: 1.55, color: "#546E7A" }}>{step.description}</p>

                  {step.safetyNotes && (
                    <div style={{ fontSize: 9, marginBottom: 4, marginLeft: 30, padding: "4px 8px", background: "#FFF3E0", borderRadius: 4, color: "#E65100" }}><span style={{ fontWeight: 700 }}>⚠ {step.safetyNotes}</span></div>
                  )}

                  {step.expectedResult && (
                    <div style={{ fontSize: 9, marginBottom: 4, marginLeft: 30 }}>
                      <span style={{ fontWeight: 700, color: "#0D9488" }}>Expected result:</span> <span style={{ color: "#455A64" }}>{step.expectedResult}</span>
                    </div>
                  )}

                  {step.image && <img src={step.image} alt="planned" style={{ marginLeft: 30, maxWidth: 280, maxHeight: 180, borderRadius: 6, border: "1px solid #E0E0E0", marginTop: 6 }} />}
                  {(step.images ?? []).map((img, imgIdx) => (
                    <img key={imgIdx} src={img} alt={`planned-${imgIdx}`} style={{ marginLeft: 30, maxWidth: 280, maxHeight: 180, borderRadius: 6, border: "1px solid #E0E0E0", marginTop: 6 }} />
                  ))}

                  {/* Execution record */}
                  <div style={{ marginTop: 10, marginLeft: 30, padding: "8px 12px", background: "#fff", border: "1px solid #E0E0E0", borderLeft: "3px solid #0D9488", borderRadius: "0 6px 6px 0" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "#0D9488", marginBottom: 4 }}>Execution &amp; Deviation Record</div>
                    {step.actualResult ? (
                      <div style={{ fontSize: 9, marginBottom: 4, color: "#5D4037" }}><span style={{ fontWeight: 700 }}>Actual result:</span> {step.actualResult}</div>
                    ) : (
                      <div style={{ fontSize: 9, color: "#999", marginBottom: 4 }}>Actual result: —</div>
                    )}
                    {step.deviationNotes && (
                      <div style={{ fontSize: 9, marginBottom: 4, color: "#C62828" }}><span style={{ fontWeight: 700 }}>Deviation / Notes:</span> {step.deviationNotes}</div>
                    )}
                    {step.actualImage && <img src={step.actualImage} alt="actual" style={{ maxWidth: 260, maxHeight: 180, borderRadius: 6, border: "1px solid #E0E0E0", marginTop: 4 }} />}
                    {(step.actualImages ?? []).map((img, imgIdx) => (
                      <img key={imgIdx} src={img} alt={`actual-${imgIdx}`} style={{ maxWidth: 260, maxHeight: 180, borderRadius: 6, border: "1px solid #E0E0E0", marginTop: 4 }} />
                    ))}
                  </div>
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
              Generated from Labify experiment execution API · {printTarget.id} · {printTarget.steps.filter((s) => s.completed).length} of {printTarget.steps.length} steps completed
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal open={previewModal} onClose={() => setPreviewModal(false)} title="Experiment Report Preview">
        {previewExp && (
          <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "8px 4px" }}>
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "32px 40px", border: "1px solid #E0E0E0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ borderBottom: "2px solid #0D9488", paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#0D9488", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Experiment Execution Report</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Montserrat', system-ui, sans-serif" }}>{previewExp.name}</h1>
                <div style={{ marginTop: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div><span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>ID</span><div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{previewExp.id}</div></div>
                  <div><span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>Start</span><div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{previewExp.startingDate || "—"}</div></div>
                  <div><span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>End</span><div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{previewExp.endingDate || "—"}</div></div>
                  {previewExp.designId && (
                    <div>
                      <span style={{ fontSize: 10, color: "#78909C", fontWeight: 600 }}>Protocol</span>
                      <div style={{ fontSize: 11, color: "#455A64", marginTop: 2 }}>{state.experimentDesigns.find((d) => d.id === previewExp.designId)?.name || previewExp.designId}</div>
                    </div>
                  )}
                </div>
              </div>

              {(previewExp.materials.length > 0 || previewExp.instruments.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  {previewExp.materials.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Materials Used</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {previewExp.materials.map((em) => {
                          const mat = state.materials.find((m) => m.code === em.materialCode);
                          return (
                            <span key={em.materialCode} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2F1", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#0D9488" }}>
                              {mat?.name || em.materialCode} · {em.quantityNeeded} {em.unit || mat?.unit || ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {previewExp.instruments.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Instruments Used</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {previewExp.instruments.map((ei) => {
                          const inst = state.instruments.find((i) => i.code === ei.instrumentCode);
                          return (
                            <span key={ei.instrumentCode} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2F1", padding: "4px 10px", borderRadius: 12, fontSize: 11, color: "#0D9488" }}>
                              {inst?.name || ei.instrumentCode} · Qty: {ei.quantityNeeded}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Procedure Steps — Execution Record</div>
              <div className="step-preview-list">
                {previewExp.steps.map((step, idx) => (
                  <div className={`step-preview ${step.completed ? "step-completed" : ""}`} key={step.id}>
                    <div className="step-preview-header">
                      <span className="step-number">{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13, color: "#263238" }}>{step.title}</strong>
                        {step.durationMinutes && <span className="step-meta">⏱ {step.durationMinutes} min</span>}
                      </div>
                      <span className={`step-check ${step.completed ? "checked" : ""}`} aria-label={step.completed ? "Completed" : "Pending"}>
                        {step.completed ? "✓" : ""}
                      </span>
                      <span className={`step-status-badge ${step.completed ? "completed" : "pending"}`}>{step.completed ? "Completed" : "Pending"}</span>
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
                      {(step.images ?? []).map((img, imgIdx) => <img key={imgIdx} src={img} alt={`planned-${imgIdx}`} className="step-image" style={{ marginTop: 4 }} />)}
                      {(step.actualResult || step.deviationNotes || step.actualImage || (step.actualImages ?? []).length > 0) && (
                        <div className="step-actual-box">
                          <div className="actual-header">📝 Execution &amp; Deviation Record</div>
                          <div className="actual-body">
                            {step.actualResult && <p>{step.actualResult}</p>}
                            {step.deviationNotes && (
                              <div className="step-deviation">
                                <span className="deviation-icon">⚠️</span>
                                <span>{step.deviationNotes}</span>
                              </div>
                            )}
                            {step.actualImage && <img src={step.actualImage} alt="actual" className="actual-image" />}
                            {(step.actualImages ?? []).map((img, imgIdx) => <img key={imgIdx} src={img} alt={`actual-${imgIdx}`} className="actual-image" style={{ marginTop: 4 }} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {previewExp.conclusion && (
                <div className="conclusion-card" style={{ marginTop: 20 }}>
                  <strong>Conclusion:</strong> {previewExp.conclusion}
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #ECEFF1", fontSize: 10, color: "#90A4AE" }}>
                Generated by Labify · {previewExp.steps.filter((s) => s.completed).length}/{previewExp.steps.length} steps completed
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
