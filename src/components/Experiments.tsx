import React, { useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, FileSpreadsheet, FileText, ExternalLink, Link2, Search, ShoppingCart, Copy } from "lucide-react";
import { useStore, useExperimentActions, generateExperimentId, useOrderActions } from "../store";
import type { Experiment, ExperimentMaterial, ExperimentInstrument, DocumentLink } from "../types";
import Modal from "./Modal";
import { downloadExcel, downloadExperimentExcel } from "../export";
import { AttachmentList, AttachmentUploader, useAttachmentHelpers } from "./Attachments";

function empty(): Experiment {
  return { id: "", name: "", materials: [], instruments: [], startingDate: "", endingDate: "", docLinks: [], attachments: [] };
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
    const newId = generateExperimentId(state.experiments);
    const clone: Experiment = {
      ...e,
      id: newId,
      name: `${e.name} (Copy)`,
      docLinks: e.docLinks ? e.docLinks.map((dl) => ({ ...dl, id: crypto.randomUUID() })) : [],
      attachments: e.attachments ? e.attachments.map((att) => ({ ...att, id: crypto.randomUUID() })) : [],
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
    const newLink: DocumentLink = { id: crypto.randomUUID(), label: "", url: "" };
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
      id: crypto.randomUUID(),
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
              <th style={{ width: 80 }}></th>
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
                      <button className="icon-btn" title="Duplicate" onClick={() => duplicate(exp)}><Copy size={14} /></button>
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
    </div>
  );
}
