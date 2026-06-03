import React, { useState, useRef } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, FileSpreadsheet, FileText, ExternalLink, Link2, Search, ShoppingCart, Copy, X, Image as ImageIcon } from "lucide-react";
import { useStore, useExperimentActions, generateExperimentId, useOrderActions } from "../store";
import type { Experiment, ExperimentMaterial, ExperimentInstrument, DocumentLink, ExperimentStep } from "../types";
import { generateId } from "../utils";
import Modal from "./Modal";
import { downloadExcel, downloadExperimentExcel } from "../export";
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

  const {
    fileRef: docRef,
    addFile: addDocFile,
    removeFile: removeDocFile,
  } = useAttachmentHelpers(editing?.attachments, (items) => {
    setEditing((prev) => (prev ? { ...prev, attachments: items } : prev));
  });

  const stepImageRef = useRef<HTMLInputElement>(null);
  const [activeStepImage, setActiveStepImage] = useState<number | null>(null);

  const openAdd = () => {
    const nextId = generateExperimentId(state.experiments);
    setEditing({ ...empty(), id: nextId });
    setModal(true);
  };

  const openEdit = (e: Experiment) => {
    setEditing({ ...e, docLinks: e.docLinks ? [...e.docLinks] : [], attachments: e.attachments ? [...e.attachments] : [] });
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
      steps: e.steps ? e.steps.map((s) => ({ ...s, id: generateId(), completed: false, actualResult: "", deviationNotes: "", actualImage: "" })) : [],
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
      actualResult: "",
      deviationNotes: "",
      actualImage: "",
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

  const onStepImageChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateStep(i, { actualImage: reader.result as string });
    };
    reader.readAsDataURL(file);
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

  const exportSingle = (exp: Experiment) => {
    const matEnriched = state.materials.map((m) => {
      const s = state.suppliers.find((x) => x.id === m.supplierId);
      return { code: m.code, name: m.name, supplierName: s?.name ?? m.supplierId, price: m.price, unit: m.unit, link: m.link, consumable: m.consumable, image: m.image, attachments: m.attachments };
    });
    const instEnriched = state.instruments.map((inst) => {
      const s = state.suppliers.find((x) => x.id === inst.supplierId);
      return { code: inst.code, name: inst.name, supplierName: s?.name ?? inst.supplierId, price: inst.price };
    });
    downloadExperimentExcel(exp, matEnriched, instEnriched);
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
                      <button className="icon-btn" title="Export" onClick={() => exportSingle(exp)}><FileSpreadsheet size={14} /></button>
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
                                      {(step.actualResult || step.deviationNotes || step.actualImage) && (
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
            </label>
            <div className="sub-form-list procedure-steps">
              {editing?.steps.map((step, i) => (
                <div className="step-card" key={step.id}>
                  <div className="step-card-header">
                    <span className="step-number">{i + 1}</span>
                    <strong style={{ fontSize: 12 }}>{step.title}</strong>
                    <button className="icon-btn danger" onClick={() => removeStep(i)}><Trash2 size={12} /></button>
                  </div>
                  <p style={{ fontSize: 11, color: "#78909C", margin: "0 0 8px" }}>{step.description}</p>
                  {step.expectedResult && <p style={{ fontSize: 11, color: "#0D9488", margin: "0 0 8px" }}><strong>Expected:</strong> {step.expectedResult}</p>}
                  <div className="field" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: "10px", color: "#0D9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Actual Result</label>
                    <input value={step.actualResult || ""} onChange={(e) => updateStep(i, { actualResult: e.target.value })} placeholder="What was observed..." />
                  </div>
                  <div className="field" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: "10px", color: "#C62828", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Deviation / Notes</label>
                    <textarea value={step.deviationNotes || ""} onChange={(e) => updateStep(i, { deviationNotes: e.target.value })} rows={2} placeholder="Any deviation from protocol..." />
                  </div>
                  <label className="checkbox-field" style={{ marginBottom: 8 }}>
                    <input type="checkbox" checked={step.completed} onChange={(e) => updateStep(i, { completed: e.target.checked })} />
                    <span>Step completed</span>
                  </label>
                  <div className="image-upload" style={{ gap: "0.5rem" }}>
                    {step.actualImage ? (
                      <div style={{ position: "relative" }}>
                        <img src={step.actualImage} alt="actual" className="image-preview" style={{ maxHeight: 80, borderRadius: 6 }} />
                        <button className="icon-btn danger" style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)" }} onClick={() => updateStep(i, { actualImage: "" })}><X size={12} color="#fff" /></button>
                      </div>
                    ) : (
                      <div className="image-preview-placeholder"><ImageIcon size={20} /></div>
                    )}
                    <button type="button" className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => { setActiveStepImage(i); stepImageRef.current?.click(); }}>
                      {step.actualImage ? "Change photo" : "Upload photo"}
                    </button>
                  </div>
                </div>
              ))}
              {editing?.steps.length === 0 && <div style={{ fontSize: 12, color: "#78909C", padding: "8px 0" }}>Select a design above to load steps, or add them manually.</div>}
            </div>
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
      <input ref={stepImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
        if (activeStepImage !== null) {
          onStepImageChange(activeStepImage, e);
          setActiveStepImage(null);
        }
      }} />
    </div>
  );
}
