import * as XLSX from "xlsx";

// ─── Styling helpers ─────────────────────────────────────────────
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "0D9488" }, patternType: "solid" }, // teal-600
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "0F766E" } },
    bottom: { style: "thin", color: { rgb: "0F766E" } },
    left: { style: "thin", color: { rgb: "0F766E" } },
    right: { style: "thin", color: { rgb: "0F766E" } },
  },
};

const CELL_STYLE = {
  border: {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } },
  },
  alignment: { vertical: "center" },
};

const SUBTOTAL_STYLE = {
  font: { bold: true },
  fill: { fgColor: { rgb: "F0FDFA" }, patternType: "solid" },
  border: {
    top: { style: "medium", color: { rgb: "0D9488" } },
    bottom: { style: "double", color: { rgb: "0D9488" } },
  },
};

const TITLE_STYLE = {
  font: { bold: true, sz: 14, color: { rgb: "0F766E" } },
  alignment: { horizontal: "left", vertical: "center" },
};

const SECTION_TITLE_STYLE = {
  font: { bold: true, sz: 12, color: { rgb: "0D9488" } },
  alignment: { horizontal: "left", vertical: "center" },
};

const CURRENCY_STYLE = {
  numFmt: '"$"#,##0.00',
  alignment: { horizontal: "right", vertical: "center" },
};

const CENTER = {
  alignment: { horizontal: "center", vertical: "center" },
};

const BOLD = {
  font: { bold: true },
};

const ZEBRA_STYLE = {
  fill: { fgColor: { rgb: "F8FAFA" }, patternType: "solid" },
};

const TOTAL_ROW_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "0D9488" }, patternType: "solid" },
  border: {
    top: { style: "medium", color: { rgb: "0F766E" } },
    bottom: { style: "medium", color: { rgb: "0F766E" } },
    left: { style: "thin", color: { rgb: "0F766E" } },
    right: { style: "thin", color: { rgb: "0F766E" } },
  },
  alignment: { horizontal: "right", vertical: "center" },
};

const TITLE_ROW_STYLE = {
  font: { bold: true, sz: 16, color: { rgb: "0D9488" } },
  alignment: { horizontal: "left", vertical: "center" },
};

const SUBTITLE_ROW_STYLE = {
  font: { sz: 10, color: { rgb: "78909C" } },
  alignment: { horizontal: "left", vertical: "center" },
};

function applyZebraStriping(ws: XLSX.WorkSheet, range: string) {
  const decoded = XLSX.utils.decode_range(range);
  for (let R = decoded.s.r; R <= decoded.e.r; ++R) {
    if ((R - decoded.s.r) % 2 === 1) {
      for (let C = decoded.s.c; C <= decoded.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = { ...ws[addr].s, ...ZEBRA_STYLE };
      }
    }
  }
}

function applyHeaderStyle(ws: XLSX.WorkSheet, range: string) {
  const decoded = XLSX.utils.decode_range(range);
  for (let R = decoded.s.r; R <= decoded.e.r; ++R) {
    for (let C = decoded.s.c; C <= decoded.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { ...HEADER_STYLE };
    }
  }
}

function applyCellBorders(ws: XLSX.WorkSheet, range: string) {
  const decoded = XLSX.utils.decode_range(range);
  for (let R = decoded.s.r; R <= decoded.e.r; ++R) {
    for (let C = decoded.s.c; C <= decoded.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { ...ws[addr].s, ...CELL_STYLE };
    }
  }
}

function setColWidths(ws: XLSX.WorkSheet, widths: { wch: number }[]) {
  ws["!cols"] = widths;
}

function setFreeze(ws: XLSX.WorkSheet, row: number, col: number) {
  ws["!freeze"] = { xSplit: col, ySplit: row, topLeft: { r: row, c: col } };
}

// ─── Public exports ────────────────────────────────────────────────

export function downloadExcel(filename: string, sheetName: string, rows: Record<string, string | number | boolean>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const range = ws["!ref"];
  if (range) {
    const decoded = XLSX.utils.decode_range(range);
    // Header row
    applyHeaderStyle(ws, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: decoded.e.c } }));
    // Data rows: borders + zebra
    if (decoded.e.r > 0) {
      applyCellBorders(ws, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
      applyZebraStriping(ws, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
    }
    // Column widths based on headers
    setColWidths(
      ws,
      Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length + 3, 14) }))
    );
  }

  XLSX.writeFile(wb, filename);
}

export function downloadExperimentExcel(
  exp: {
    id: string;
    name: string;
    startingDate: string;
    endingDate: string;
    materials: { materialCode: string; quantityNeeded: number; unit?: string }[];
    instruments: { instrumentCode: string; quantityNeeded: number }[];
    docLinks?: { label: string; url: string }[];
    attachments?: { name: string }[];
  },
  allMaterials: { code: string; name: string; supplierName: string; price: number; unit: string; link?: string; consumable?: boolean; image?: string; attachments?: { name: string }[] }[],
  allInstruments: { code: string; name: string; supplierName: string; price: number }[]
) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Experiment (overview + materials table) ────────────
  let totalCost = 0;
  for (const em of exp.materials) {
    const mat = allMaterials.find((m) => m.code === em.materialCode);
    totalCost += (mat?.price ?? 0) * em.quantityNeeded;
  }
  for (const ei of exp.instruments) {
    const inst = allInstruments.find((i) => i.code === ei.instrumentCode);
    totalCost += (inst?.price ?? 0) * ei.quantityNeeded;
  }

  const overview = [
    { Field: "ID", Value: exp.id },
    { Field: "Name", Value: exp.name },
    { Field: "Start Date", Value: exp.startingDate },
    { Field: "End Date", Value: exp.endingDate },
    { Field: "Material Count", Value: exp.materials.length },
    { Field: "Instrument Count", Value: exp.instruments.length },
    { Field: "Total Estimated Cost", Value: totalCost },
    { Field: "Document Links Count", Value: exp.docLinks?.length ?? 0 },
    { Field: "Attachments Count", Value: exp.attachments?.length ?? 0 },
  ];

  const aoa: (string | number)[][] = [];
  // Title
  aoa.push(["Labify — Experiment Report", ""]);
  aoa.push([]);
  // Overview header
  aoa.push(["Field", "Value"]);
  for (const row of overview) {
    aoa.push([row.Field, row.Value]);
  }

  const overviewHeaderRow = 3; // 0-based
  const overviewDataEnd = overviewHeaderRow + overview.length;

  // Materials sub-table
  let matSubtotalRow = -1;
  if (exp.materials.length > 0) {
    aoa.push([]);
    aoa.push(["Materials used in this experiment", ""]);
    aoa.push([]);
    const matHeader = ["#", "Material ID", "Material Name", "Quantity Needed", "Unit", "Unit Price", "Line Cost", "Supplier", "Product Link"];
    aoa.push(matHeader);
    const matHeaderRow = aoa.length - 1;

    let idx = 0;
    let sheetMatCost = 0;
    for (const em of exp.materials) {
      const mat = allMaterials.find((m) => m.code === em.materialCode);
      const lineCost = (mat?.price ?? 0) * em.quantityNeeded;
      sheetMatCost += lineCost;
      idx++;
      aoa.push([
        idx,
        em.materialCode,
        mat?.name ?? "-",
        em.quantityNeeded,
        em.unit ?? mat?.unit ?? "",
        mat?.price ?? 0,
        lineCost,
        mat?.supplierName ?? "-",
        mat?.link ?? "-",
      ]);
    }
    matSubtotalRow = aoa.length;
    aoa.push(["", "", "MATERIALS SUBTOTAL", "", "", "", sheetMatCost, "", ""]);

    // ── Style the Experiment sheet ──
    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    const maxC = matHeader.length - 1;

    // Title styling
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    ws1[titleCell] = ws1[titleCell] || { v: "" };
    ws1[titleCell].s = { ...TITLE_STYLE };

    // Overview header
    applyHeaderStyle(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow, c: 0 }, e: { r: overviewHeaderRow, c: 1 } }));
    // Overview data
    applyCellBorders(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow + 1, c: 0 }, e: { r: overviewDataEnd, c: 1 } }));
    applyZebraStriping(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow + 1, c: 0 }, e: { r: overviewDataEnd, c: 1 } }));
    // Bold + right-align the cost field
    const costCell = XLSX.utils.encode_cell({ r: overviewHeaderRow + 1 + overview.findIndex((o) => o.Field === "Total Estimated Cost"), c: 1 });
    if (ws1[costCell]) {
      ws1[costCell].s = { ...ws1[costCell].s, ...CURRENCY_STYLE, ...BOLD };
    }

    // Section title
    const secRow = overviewDataEnd + 1;
    const secCell = XLSX.utils.encode_cell({ r: secRow, c: 0 });
    ws1[secCell] = ws1[secCell] || { v: "" };
    ws1[secCell].s = { ...SECTION_TITLE_STYLE };

    // Materials header
    applyHeaderStyle(ws1, XLSX.utils.encode_range({ s: { r: matHeaderRow, c: 0 }, e: { r: matHeaderRow, c: maxC } }));
    // Materials data
    applyCellBorders(ws1, XLSX.utils.encode_range({ s: { r: matHeaderRow + 1, c: 0 }, e: { r: matSubtotalRow - 1, c: maxC } }));
    // Subtotal row
    for (let C = 0; C <= maxC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: matSubtotalRow, c: C });
      if (!ws1[addr]) continue;
      ws1[addr].s = { ...ws1[addr].s, ...SUBTOTAL_STYLE };
    }
    // Currency formatting for Unit Price and Line Cost
    for (let R = matHeaderRow + 1; R <= matSubtotalRow; ++R) {
      for (const col of [5, 6]) {
        // Unit Price (5) and Line Cost (6)
        const addr = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws1[addr]) ws1[addr].s = { ...ws1[addr].s, ...CURRENCY_STYLE };
      }
    }
    // Center the # column
    for (let R = matHeaderRow; R <= matSubtotalRow; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws1[addr]) ws1[addr].s = { ...ws1[addr].s, ...CENTER };
    }

    // Column widths
    setColWidths(ws1, [
      { wch: 4 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
    ]);

    XLSX.utils.book_append_sheet(wb, ws1, "Experiment");
  } else {
    // No materials — still style the overview-only sheet
    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    ws1[titleCell] = ws1[titleCell] || { v: "" };
    ws1[titleCell].s = { ...TITLE_STYLE };
    applyHeaderStyle(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow, c: 0 }, e: { r: overviewHeaderRow, c: 1 } }));
    applyCellBorders(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow + 1, c: 0 }, e: { r: overviewDataEnd, c: 1 } }));
    applyZebraStriping(ws1, XLSX.utils.encode_range({ s: { r: overviewHeaderRow + 1, c: 0 }, e: { r: overviewDataEnd, c: 1 } }));
    const costCell = XLSX.utils.encode_cell({ r: overviewHeaderRow + 1 + overview.findIndex((o) => o.Field === "Total Estimated Cost"), c: 1 });
    if (ws1[costCell]) ws1[costCell].s = { ...ws1[costCell].s, ...CURRENCY_STYLE, ...BOLD };
    setColWidths(ws1, [{ wch: 20 }, { wch: 35 }]);
    XLSX.utils.book_append_sheet(wb, ws1, "Experiment");
  }

  // ── Sheet 2: Materials (detailed) ──────────────────────────────
  let matCost = 0;
  const matRows = exp.materials.map((em, idx) => {
    const mat = allMaterials.find((m) => m.code === em.materialCode);
    const lineCost = (mat?.price ?? 0) * em.quantityNeeded;
    matCost += lineCost;
    return {
      "#": idx + 1,
      "Material ID": em.materialCode,
      "Material Name": mat?.name ?? "-",
      "Quantity Needed": em.quantityNeeded,
      "Unit": em.unit ?? mat?.unit ?? "",
      "Unit Price": mat?.price ?? 0,
      "Line Cost": lineCost,
      "Supplier": mat?.supplierName ?? "-",
      "Product Link": mat?.link ?? "-",
      "Consumable": mat?.consumable ? "Yes" : "No",
      "Has Image": mat?.image ? "Yes" : "No",
      "Attachments Count": mat?.attachments?.length ?? 0,
    };
  });
  if (matRows.length > 0) {
    matRows.push({ "#": 0, "Material ID": "", "Material Name": "MATERIALS SUBTOTAL", "Quantity Needed": 0, "Unit": "", "Unit Price": 0, "Line Cost": matCost, "Supplier": "", "Product Link": "", "Consumable": "", "Has Image": "", "Attachments Count": 0 });
  }
  const ws2 = XLSX.utils.json_to_sheet(matRows);
  if (ws2["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws2["!ref"]!);
    applyHeaderStyle(ws2, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: decoded.e.c } }));
    if (decoded.e.r > 0) {
      applyCellBorders(ws2, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r - 1, c: decoded.e.c } }));
      applyZebraStriping(ws2, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r - 1, c: decoded.e.c } }));
      // Subtotal row
      for (let C = 0; C <= decoded.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: decoded.e.r, c: C });
        if (ws2[addr]) ws2[addr].s = { ...ws2[addr].s, ...SUBTOTAL_STYLE };
      }
    }
    // Currency on Unit Price (5) and Line Cost (6)
    for (let R = 1; R <= decoded.e.r; ++R) {
      for (const col of [5, 6]) {
        const addr = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws2[addr]) ws2[addr].s = { ...ws2[addr].s, ...CURRENCY_STYLE };
      }
    }
    // Center # column
    for (let R = 0; R <= decoded.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws2[addr]) ws2[addr].s = { ...ws2[addr].s, ...CENTER };
    }
    setColWidths(ws2, [
      { wch: 4 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
    ]);
    setFreeze(ws2, 1, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws2, "Materials");

  // ── Sheet 3: Instruments ───────────────────────────────────────
  let instCost = 0;
  const instRows = exp.instruments.map((ei, idx) => {
    const inst = allInstruments.find((i) => i.code === ei.instrumentCode);
    const lineCost = (inst?.price ?? 0) * ei.quantityNeeded;
    instCost += lineCost;
    return {
      "#": idx + 1,
      "Instrument ID": ei.instrumentCode,
      "Instrument Name": inst?.name ?? "-",
      "Quantity Needed": ei.quantityNeeded,
      "Unit Price": inst?.price ?? 0,
      "Line Cost": lineCost,
      "Supplier": inst?.supplierName ?? "-",
    };
  });
  if (instRows.length > 0) {
    instRows.push({ "#": 0, "Instrument ID": "", "Instrument Name": "", "Quantity Needed": 0, "Unit Price": 0, "Line Cost": instCost, "Supplier": "INSTRUMENTS SUBTOTAL" });
  }
  const ws3 = XLSX.utils.json_to_sheet(instRows);
  if (ws3["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws3["!ref"]!);
    applyHeaderStyle(ws3, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: decoded.e.c } }));
    if (decoded.e.r > 0) {
      applyCellBorders(ws3, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r - 1, c: decoded.e.c } }));
      applyZebraStriping(ws3, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r - 1, c: decoded.e.c } }));
      for (let C = 0; C <= decoded.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: decoded.e.r, c: C });
        if (ws3[addr]) ws3[addr].s = { ...ws3[addr].s, ...SUBTOTAL_STYLE };
      }
    }
    for (let R = 1; R <= decoded.e.r; ++R) {
      for (const col of [4, 5]) {
        const addr = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws3[addr]) ws3[addr].s = { ...ws3[addr].s, ...CURRENCY_STYLE };
      }
    }
    for (let R = 0; R <= decoded.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws3[addr]) ws3[addr].s = { ...ws3[addr].s, ...CENTER };
    }
    setColWidths(ws3, [
      { wch: 4 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ]);
    setFreeze(ws3, 1, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws3, "Instruments");

  // ── Sheet 4: Cost Summary ──────────────────────────────────────
  const costRows = [
    { Category: "Materials", Subtotal: matCost },
    { Category: "Instruments", Subtotal: instCost },
    { Category: "TOTAL", Subtotal: totalCost },
  ];
  const ws4 = XLSX.utils.json_to_sheet(costRows);
  if (ws4["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws4["!ref"]!);
    applyHeaderStyle(ws4, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: decoded.e.c } }));
    applyCellBorders(ws4, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
    applyZebraStriping(ws4, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
    // Bold + currency on subtotal column
    for (let R = 1; R <= decoded.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 1 });
      if (ws4[addr]) ws4[addr].s = { ...ws4[addr].s, ...CURRENCY_STYLE };
    }
    // Bold the TOTAL row
    const totalRow = decoded.e.r;
    for (let C = 0; C <= decoded.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: totalRow, c: C });
      if (ws4[addr]) ws4[addr].s = { ...ws4[addr].s, ...SUBTOTAL_STYLE };
    }
    setColWidths(ws4, [{ wch: 16 }, { wch: 14 }]);
    setFreeze(ws4, 1, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws4, "Cost Summary");

  // ── Sheet 5: Documents ─────────────────────────────────────────
  const docRows = [
    ...(exp.docLinks?.map((dl) => ({ Type: "Link", Name: dl.label, URL: dl.url })) ?? []),
    ...(exp.attachments?.map((att) => ({ Type: "File", Name: att.name, URL: "(see file attachment in app)" })) ?? []),
  ];
  if (docRows.length === 0) docRows.push({ Type: "-", Name: "-", URL: "-" });
  const ws5 = XLSX.utils.json_to_sheet(docRows);
  if (ws5["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws5["!ref"]!);
    applyHeaderStyle(ws5, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: decoded.e.c } }));
    applyCellBorders(ws5, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
    applyZebraStriping(ws5, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: decoded.e.r, c: decoded.e.c } }));
    setColWidths(ws5, [{ wch: 10 }, { wch: 30 }, { wch: 50 }]);
    setFreeze(ws5, 1, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws5, "Documents");

  XLSX.writeFile(wb, `${exp.id}-experiment.xlsx`);
}

export function downloadDesignBOM(
  design: ExperimentDesign,
  allMaterials: { code: string; name: string; supplierName: string; price: number; unit: string }[],
  allInstruments: { code: string; name: string; supplierName: string; price: number }[]
) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString();

  // ── Sheet 1: Materials ───────────────────────────────────────
  const matRows = design.materials.map((code, idx) => {
    const mat = allMaterials.find((m) => m.code === code);
    return {
      "#": idx + 1,
      "Material ID": code,
      Name: mat?.name ?? "-",
      Supplier: mat?.supplierName ?? "-",
      Unit: mat?.unit ?? "-",
      "Unit Price": mat?.price ?? 0,
      "Qty Needed": 1,
      "Line Cost": mat?.price ?? 0,
    };
  });
  // Insert title / subtitle above data
  const ws1Data = [
    { "#": "", "Material ID": `BOM — ${design.name}`, Name: "", Supplier: "", Unit: "", "Unit Price": "", "Qty Needed": "", "Line Cost": "" },
    { "#": "", "Material ID": `Design: ${design.id}  ·  ${today}`, Name: "", Supplier: "", Unit: "", "Unit Price": "", "Qty Needed": "", "Line Cost": "" },
    {}, // blank separator
    ...matRows,
  ];
  const matTotal = matRows.reduce((sum, r) => sum + (r["Line Cost"] as number), 0);
  ws1Data.push({ "#": "", "Material ID": "", Name: "", Supplier: "", Unit: "", "Unit Price": "TOTAL", "Qty Needed": "", "Line Cost": matTotal } as any);

  const ws1 = XLSX.utils.json_to_sheet(ws1Data);
  if (ws1["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws1["!ref"]);
    const lastR = decoded.e.r;
    const lastC = decoded.e.c;

    // Title row (row 0)
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws1[addr]) continue;
      ws1[addr].s = { ...TITLE_ROW_STYLE };
    }
    // Subtitle row (row 1)
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 1, c: C });
      if (!ws1[addr]) continue;
      ws1[addr].s = { ...SUBTITLE_ROW_STYLE };
    }
    // Header row (row 2)
    applyHeaderStyle(ws1, XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: lastC } }));
    // Data rows (rows 3 .. lastR-1)
    applyCellBorders(ws1, XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: lastR - 1, c: lastC } }));
    applyZebraStriping(ws1, XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: lastR - 1, c: lastC } }));
    // Currency formatting on Unit Price (5), Qty (6), Line Cost (7)
    for (let R = 3; R <= lastR - 1; ++R) {
      for (const col of [5, 7]) {
        const addr = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws1[addr]) ws1[addr].s = { ...ws1[addr].s, ...CURRENCY_STYLE };
      }
    }
    // Center the # column
    for (let R = 2; R <= lastR; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws1[addr]) ws1[addr].s = { ...ws1[addr].s, ...CENTER };
    }
    // Total row styling
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: lastR, c: C });
      if (!ws1[addr]) continue;
      if (C === 7) {
        ws1[addr].s = { ...TOTAL_ROW_STYLE, numFmt: '"$"#,##0.00' };
      } else if (C === 5) {
        ws1[addr].s = { ...TOTAL_ROW_STYLE, numFmt: '"$"#,##0.00' };
      } else {
        ws1[addr].s = { ...TOTAL_ROW_STYLE };
      }
    }
    setColWidths(ws1, [
      { wch: 4 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ]);
    setFreeze(ws1, 3, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Materials");

  // ── Sheet 2: Instruments ─────────────────────────────────────
  const instRows = design.instruments.map((code, idx) => {
    const inst = allInstruments.find((i) => i.code === code);
    return {
      "#": idx + 1,
      "Instrument ID": code,
      Name: inst?.name ?? "-",
      Supplier: inst?.supplierName ?? "-",
      "Unit Price": inst?.price ?? 0,
      "Qty Needed": 1,
      "Line Cost": inst?.price ?? 0,
    };
  });
  const ws2Data = [
    { "#": "", "Instrument ID": `BOM — ${design.name}`, Name: "", Supplier: "", "Unit Price": "", "Qty Needed": "", "Line Cost": "" },
    { "#": "", "Instrument ID": `Design: ${design.id}  ·  ${today}`, Name: "", Supplier: "", "Unit Price": "", "Qty Needed": "", "Line Cost": "" },
    {},
    ...instRows,
  ];
  const instTotal = instRows.reduce((sum, r) => sum + (r["Line Cost"] as number), 0);
  ws2Data.push({ "#": "", "Instrument ID": "", Name: "", Supplier: "", "Unit Price": "TOTAL", "Qty Needed": "", "Line Cost": instTotal } as any);

  const ws2 = XLSX.utils.json_to_sheet(ws2Data);
  if (ws2["!ref"]) {
    const decoded = XLSX.utils.decode_range(ws2["!ref"]);
    const lastR = decoded.e.r;
    const lastC = decoded.e.c;

    // Title row
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws2[addr]) continue;
      ws2[addr].s = { ...TITLE_ROW_STYLE };
    }
    // Subtitle row
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 1, c: C });
      if (!ws2[addr]) continue;
      ws2[addr].s = { ...SUBTITLE_ROW_STYLE };
    }
    // Header row (row 2)
    applyHeaderStyle(ws2, XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: lastC } }));
    // Data rows
    applyCellBorders(ws2, XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: lastR - 1, c: lastC } }));
    applyZebraStriping(ws2, XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: lastR - 1, c: lastC } }));
    // Currency
    for (let R = 3; R <= lastR - 1; ++R) {
      for (const col of [4, 6]) {
        const addr = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws2[addr]) ws2[addr].s = { ...ws2[addr].s, ...CURRENCY_STYLE };
      }
    }
    // Center #
    for (let R = 2; R <= lastR; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws2[addr]) ws2[addr].s = { ...ws2[addr].s, ...CENTER };
    }
    // Total row
    for (let C = 0; C <= lastC; ++C) {
      const addr = XLSX.utils.encode_cell({ r: lastR, c: C });
      if (!ws2[addr]) continue;
      if (C === 4 || C === 6) {
        ws2[addr].s = { ...TOTAL_ROW_STYLE, numFmt: '"$"#,##0.00' };
      } else {
        ws2[addr].s = { ...TOTAL_ROW_STYLE };
      }
    }
    setColWidths(ws2, [
      { wch: 4 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ]);
    setFreeze(ws2, 3, 0);
  }
  XLSX.utils.book_append_sheet(wb, ws2, "Instruments");

  XLSX.writeFile(wb, `${design.id}_${design.name.replace(/\s+/g, "_")}_BOM.xlsx`);
}

import type { ExperimentDesign, Experiment } from "./types";
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function downloadExperimentDesignWord(design: ExperimentDesign, _experiments: Experiment[]) {
  const rows: TableRow[] = [];
  for (const step of design.steps) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            verticalAlign: "center",
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(step.order + 1), bold: true, font: "Montserrat", color: "0D9488", size: 20 })] })],
          }),
          new TableCell({
            verticalAlign: "center",
            children: [
              new Paragraph({ children: [new TextRun({ text: step.title, bold: true, font: "Montserrat", size: 22 })] }),
              new Paragraph({ children: [new TextRun({ text: step.description, font: "Montserrat", size: 20, color: "546E7A" })] }),
              step.durationMinutes ? new Paragraph({ children: [new TextRun({ text: `⏱ ${step.durationMinutes} min`, font: "Montserrat", size: 18, color: "90A4AE" })] }) : new Paragraph({ text: "" }),
              step.safetyNotes ? new Paragraph({ children: [new TextRun({ text: `⚠️ ${step.safetyNotes}`, font: "Montserrat", size: 18, color: "E65100" })] }) : new Paragraph({ text: "" }),
            ],
          }),
          new TableCell({
            verticalAlign: "center",
            children: [
              new Paragraph({ children: [new TextRun({ text: step.expectedResult || "—", font: "Montserrat", size: 20, color: "0D9488" })] }),
            ],
          }),
        ],
      })
    );
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: design.name, bold: true, font: "Montserrat", size: 36, color: "0D9488" })],
      spacing: { after: 200 },
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `ID: `, bold: true, font: "Montserrat", size: 18, color: "78909C" }),
        new TextRun({ text: design.id, font: "Montserrat", size: 18, color: "455A64" }),
      ],
      spacing: { after: 100 },
    }),
  ];

  if (design.objective) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "OBJECTIVE", bold: true, font: "Montserrat", size: 18, color: "0D9488" })],
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({ children: [new TextRun({ text: design.objective, font: "Montserrat", size: 22, color: "37474F" })], spacing: { after: 200 } })
    );
  }

  if (design.hypothesis) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "HYPOTHESIS", bold: true, font: "Montserrat", size: 18, color: "0D9488" })],
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({ children: [new TextRun({ text: design.hypothesis, font: "Montserrat", size: 22, color: "37474F" })], spacing: { after: 200 } })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "PROCEDURE STEPS", bold: true, font: "Montserrat", size: 18, color: "0D9488" })],
      spacing: { before: 400, after: 200 },
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "0D9488" },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, font: "Montserrat", size: 20, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "0D9488" },
              children: [new Paragraph({ children: [new TextRun({ text: "Step Details", bold: true, font: "Montserrat", size: 20, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "0D9488" },
              children: [new Paragraph({ children: [new TextRun({ text: "Expected Result", bold: true, font: "Montserrat", size: 20, color: "FFFFFF" })] })],
            }),
          ],
        }),
        ...rows,
      ],
    })
  );

  if (design.conclusion) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "EXPECTED CONCLUSION", bold: true, font: "Montserrat", size: 18, color: "0D9488" })],
        spacing: { before: 400, after: 100 },
      }),
      new Paragraph({ children: [new TextRun({ text: design.conclusion, font: "Montserrat", size: 22, color: "37474F" })], spacing: { after: 200 } })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Generated by Labify · ${design.steps.length} steps · ${new Date().toLocaleDateString()}`, font: "Montserrat", size: 16, color: "90A4AE", italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${design.id}_${design.name.replace(/\s+/g, "_")}.docx`);
}

export async function downloadPDF(printRef: React.RefObject<HTMLDivElement | null>, filename: string) {
  if (!printRef.current) return;
  const source = printRef.current;

  // Find sections marked for atomic pagination.
  const sections = Array.from(source.querySelectorAll<HTMLElement>("[data-pdf-section]"));
  if (sections.length === 0) {
    return legacyDownloadPDF(source, filename);
  }

  const sourceRect = source.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(source);
  const paddingTop = parseFloat(sourceStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(sourceStyle.paddingBottom) || 0;

  // A4 with 10mm margins: the image occupies 190mm wide and 277mm tall.
  const pdfImgWidthMm = 190;
  const pdfUsableHeightMm = 277;
  // Convert PDF height budget to source pixels using the same scale as the legacy export.
  const maxTotalPageHeightPx = (pdfUsableHeightMm * sourceRect.width) / pdfImgWidthMm;
  // Reserve the source padding plus a small safety margin for collapsed inter-section margins.
  const safetyPx = 40;
  const maxContentHeightPx = Math.max(100, maxTotalPageHeightPx - paddingTop - paddingBottom - safetyPx);

  // Measure each section's footprint, including the gap to the following section.
  const sectionInfos = sections.map((el, i) => {
    const rect = el.getBoundingClientRect();
    let footprint = rect.height;
    if (i < sections.length - 1) {
      const nextRect = sections[i + 1].getBoundingClientRect();
      footprint += Math.max(0, nextRect.top - rect.bottom);
    } else {
      const marginBottom = parseFloat(window.getComputedStyle(el).marginBottom) || 0;
      footprint += marginBottom;
    }
    return { el, footprint };
  });

  // Pack sections into pages without splitting any section.
  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;
  for (let i = 0; i < sectionInfos.length; i++) {
    const info = sectionInfos[i];
    if (currentHeight + info.footprint > maxContentHeightPx && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(i);
    currentHeight += info.footprint;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  const pdf = new jsPDF("p", "mm", "a4");

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage();

    // Clone the whole source so styles, fonts and images stay intact,
    // then hide every section that does not belong to this page.
    const clone = source.cloneNode(true) as HTMLElement;
    const cloneSections = Array.from(clone.querySelectorAll<HTMLElement>("[data-pdf-section]"));
    for (let i = 0; i < cloneSections.length; i++) {
      if (!pages[p].includes(i)) {
        cloneSections[i].style.display = "none";
      }
    }

    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = `${sourceRect.width}px`;
    clone.style.maxWidth = `${sourceRect.width}px`;
    clone.style.overflow = "visible";
    document.body.appendChild(clone);

    // Allow fonts and images to settle before capturing.
    await new Promise((r) => setTimeout(r, 800));
    const canvas = await html2canvas(clone, {
      scale: 5,
      useCORS: true,
      backgroundColor: "#FFFFFF",
      logging: false,
      imageTimeout: 0,
      letterRendering: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    document.body.removeChild(clone);
  }

  pdf.save(filename);
}

async function legacyDownloadPDF(source: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(source, {
    scale: 5,
    useCORS: true,
    imageTimeout: 0,
    letterRendering: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imgWidth = 190;
  const pageHeight = 277;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}

export async function downloadExperimentDesignPDF(design: ExperimentDesign, printRef: React.RefObject<HTMLDivElement | null>) {
  const filename = `${design.id}_${design.name.replace(/\s+/g, "_")}.pdf`;
  await downloadPDF(printRef, filename);
}

export async function downloadExperimentPDF(exp: Experiment, printRef: React.RefObject<HTMLDivElement | null>) {
  const filename = `${exp.id}_${exp.name.replace(/\s+/g, "_")}.pdf`;
  await downloadPDF(printRef, filename);
}
