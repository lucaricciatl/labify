import * as XLSX from "xlsx";

export function downloadExcel(filename: string, sheetName: string, rows: Record<string, string | number | boolean>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function downloadExperimentExcel(
  exp: {
    id: string;
    name: string;
    startingDate: string;
    endingDate: string;
    materials: { materialCode: string; quantityNeeded: number }[];
    instruments: { instrumentCode: string; quantityNeeded: number }[];
    docLinks?: { label: string; url: string }[];
    attachments?: { name: string }[];
  },
  allMaterials: { code: string; name: string; supplierName: string; price: number; unit: string }[],
  allInstruments: { code: string; name: string; supplierName: string; price: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Experiment overview
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
    { Field: "Total Estimated Cost", Value: `$${totalCost.toFixed(2)}` },
    { Field: "Document Links Count", Value: exp.docLinks?.length ?? 0 },
    { Field: "Attachments Count", Value: exp.attachments?.length ?? 0 },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overview), "Experiment");

  // Sheet 2: Materials
  let matCost = 0;
  const matRows = exp.materials.map((em) => {
    const mat = allMaterials.find((m) => m.code === em.materialCode);
    const lineCost = (mat?.price ?? 0) * em.quantityNeeded;
    matCost += lineCost;
    return {
      "Material Code": em.materialCode,
      "Material Name": mat?.name ?? "-",
      "Quantity Needed": em.quantityNeeded,
      "Unit": mat?.unit ?? "",
      "Unit Price": mat?.price ?? 0,
      "Line Cost": lineCost,
      Supplier: mat?.supplierName ?? "-",
    };
  });
  if (matRows.length > 0) {
    matRows.push({ "Material Code": "", "Material Name": "", "Quantity Needed": 0, "Unit": "", "Unit Price": 0, "Line Cost": matCost, Supplier: "MATERIALS SUBTOTAL" });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matRows), "Materials");

  // Sheet 3: Instruments
  let instCost = 0;
  const instRows = exp.instruments.map((ei) => {
    const inst = allInstruments.find((i) => i.code === ei.instrumentCode);
    const lineCost = (inst?.price ?? 0) * ei.quantityNeeded;
    instCost += lineCost;
    return {
      "Instrument Code": ei.instrumentCode,
      "Instrument Name": inst?.name ?? "-",
      "Quantity Needed": ei.quantityNeeded,
      "Unit Price": inst?.price ?? 0,
      "Line Cost": lineCost,
      Supplier: inst?.supplierName ?? "-",
    };
  });
  if (instRows.length > 0) {
    instRows.push({ "Instrument Code": "", "Instrument Name": "", "Quantity Needed": 0, "Unit Price": 0, "Line Cost": instCost, Supplier: "INSTRUMENTS SUBTOTAL" });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instRows), "Instruments");

  // Sheet 4: Cost Summary
  const costRows = [
    { Category: "Materials", Subtotal: matCost },
    { Category: "Instruments", Subtotal: instCost },
    { Category: "TOTAL", Subtotal: totalCost },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costRows), "Cost Summary");

  // Sheet 5: Documents
  const docRows = [
    ...(exp.docLinks?.map((dl) => ({ Type: "Link", Name: dl.label, URL: dl.url })) ?? []),
    ...(exp.attachments?.map((att) => ({ Type: "File", Name: att.name, URL: "(see file attachment in app)" })) ?? []),
  ];
  if (docRows.length === 0) docRows.push({ Type: "-", Name: "-", URL: "-" });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docRows), "Documents");

  XLSX.writeFile(wb, `${exp.id}-experiment.xlsx`);
}
