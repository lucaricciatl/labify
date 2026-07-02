import { v4 as uuidv4 } from "uuid";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk3NmVjZWI1LWQ2NTYtNDhmNS04MjQwLWZiNWJjZmI3MWNkYiIsImVtYWlsIjoidGVzdEBsYWJpZnkubG9jYWwiLCJuYW1lIjoiVGVzdGVyIiwiaWF0IjoxNzgyOTExODc2LCJleHAiOjE3ODM1MTY2NzZ9.DXhFJHQlN2LlqtEj1Je8V6bxhO5sJYkaKZoLGnCPZTk";
const BASE = "http://localhost:3000";

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  return res.json();
}

// Clean previous test data (best effort)
try { await fetch(`${BASE}/api/experiment_designs/DESIGN-20250701-01`, { method: "DELETE", headers: { Authorization: `Bearer ${TOKEN}` } }); } catch {}
try { await fetch(`${BASE}/api/experiments/EXP-20250701-01`, { method: "DELETE", headers: { Authorization: `Bearer ${TOKEN}` } }); } catch {}

const design = {
  id: "DESIGN-20250701-01",
  name: "Multi-Page Protein Extraction Protocol",
  objective: "Extract and quantify total protein from mammalian cell culture using a detergent-based lysis buffer followed by BCA assay.",
  hypothesis: "A higher detergent concentration will yield more total protein but may increase foam and require longer centrifugation to clarify the lysate.",
  materials: ["MAT-001", "MAT-002", "MAT-003"],
  instruments: ["INST-001", "INST-002"],
  steps: [
    { id: uuidv4(), order: 0, title: "Prepare workspace and PPE", description: "Clear the bench, put on lab coat, safety glasses and nitrile gloves. Verify that the fume hood is operational and that waste containers are empty. Label all tubes before starting.", durationMinutes: 10, safetyNotes: "Ethanol is flammable; keep away from open flames.", expectedResult: "Clean workspace ready for cell handling" },
    { id: uuidv4(), order: 1, title: "Harvest cells by trypsinization", description: "Aspirate culture medium from the 150mm dish. Wash once with 10mL PBS. Add 2mL trypsin-EDTA and incubate at 37°C for 3-5 minutes until cells detach. Neutralize with 8mL complete medium and transfer to a 15mL conical tube.", durationMinutes: 15, safetyNotes: "Avoid over-trypsinization which reduces viability.", expectedResult: "Single-cell suspension with >95% viability" },
    { id: uuidv4(), order: 2, title: "Wash and count cells", description: "Centrifuge the cell suspension at 300 x g for 5 minutes. Aspirate supernatant carefully without disturbing the pellet. Resuspend in 5mL fresh PBS. Take a 10 microliter aliquot and mix with trypan blue. Count viable cells on a hemocytometer.", durationMinutes: 20, expectedResult: "Known cell number per mL within expected density" },
    { id: uuidv4(), order: 3, title: "Prepare lysis buffer", description: "In the cold room, prepare 10mL RIPA buffer supplemented with protease inhibitor cocktail and PMSF. Mix gently and keep on ice. Prepare three variants: standard, 1.5x detergent, and 2x detergent for comparison.", durationMinutes: 20, safetyNotes: "PMSF is toxic; handle in fume hood.", expectedResult: "Three aliquots of ice-cold lysis buffer" },
    { id: uuidv4(), order: 4, title: "Lyse cells on ice", description: "Aliquot equal cell numbers into three 1.5mL microcentrifuge tubes. Centrifuge at 300 x g for 5 minutes, remove supernatant, and resuspend each pellet in 500 microliters of the respective lysis buffer. Incubate on ice for 30 minutes with intermittent vortexing every 10 minutes.", durationMinutes: 40, expectedResult: "Turbid lysate with no visible cell clumps" },
    { id: uuidv4(), order: 5, title: "Clarify lysate by centrifugation", description: "Centrifuge lysates at 14000 x g at 4°C for 15 minutes. Carefully transfer the clarified supernatant to fresh labeled tubes without disturbing the detergent-insoluble pellet.", durationMinutes: 25, expectedResult: "Clear supernatant and compact pellet" },
    { id: uuidv4(), order: 6, title: "Prepare BCA working reagent", description: "Mix BCA reagent A and reagent B in a 50:1 ratio to make sufficient working reagent for all standards and samples. Protect from light until use.", durationMinutes: 10, expectedResult: "Homogeneous green working reagent" },
    { id: uuidv4(), order: 7, title: "Generate BSA standard curve", description: "Prepare a serial dilution of BSA standard in duplicate ranging from 0 to 2000 micrograms per mL in PBS. Pipette 25 microliters of each standard into a 96-well plate.", durationMinutes: 20, expectedResult: "Eight-point standard curve in duplicate" },
    { id: uuidv4(), order: 8, title: "Load samples and incubate", description: "Dilute each lysate 1:20 in PBS and load 25 microliters per well in duplicate. Add 200 microliters of BCA working reagent to each well. Incubate the plate at 37°C for 30 minutes.", durationMinutes: 40, safetyNotes: "Seal plate to prevent evaporation.", expectedResult: "Purple color develops proportionally to protein" },
    { id: uuidv4(), order: 9, title: "Measure absorbance and calculate concentration", description: "Cool plate to room temperature. Read absorbance at 562nm on a plate reader. Subtract blank average from all values. Plot standard curve and interpolate sample concentrations. Multiply by dilution factor to obtain original lysate concentration.", durationMinutes: 20, expectedResult: "Protein concentration for each detergent condition" },
    { id: uuidv4(), order: 10, title: "Normalize and prepare aliquots", description: "Based on measured concentrations, dilute all samples to a uniform concentration of 2 mg/mL using lysis buffer. Prepare 50 microliter aliquots and store at -80°C.", durationMinutes: 25, expectedResult: "Labeled aliquots at 2 mg/mL ready for SDS-PAGE" },
    { id: uuidv4(), order: 11, title: "Clean up and document", description: "Dispose of biohazard waste in the appropriate container. Wipe down the plate reader and bench. Export raw absorbance data and save the standard curve plot to the experiment record.", durationMinutes: 15, expectedResult: "Workspace clean, data archived" },
  ],
  conclusion: "The protocol yields reproducible total protein estimates and identifies the detergent condition with the best balance of yield and clarity.",
};

const designRes = await api("/api/experiment_designs", design);
console.log("Design created:", designRes);

const experiment = {
  id: "EXP-20250701-01",
  name: "Protein Extraction Run A",
  design_id: "DESIGN-20250701-01",
  starting_date: "2025-07-01",
  ending_date: "2025-07-02",
  materials: [
    { materialCode: "MAT-001", quantityNeeded: 5, unit: "g" },
    { materialCode: "MAT-002", quantityNeeded: 500, unit: "mL" },
    { materialCode: "MAT-003", quantityNeeded: 200, unit: "mL" },
  ],
  instruments: [
    { instrumentCode: "INST-001", quantityNeeded: 1 },
    { instrumentCode: "INST-002", quantityNeeded: 1 },
  ],
  steps: design.steps.map((s, i) => ({
    ...s,
    id: uuidv4(),
    order: i,
    completed: i < 8,
    actualResult: undefined,
    deviationNotes: i === 5 ? "Centrifuge was briefly unavailable; samples sat on ice an extra 10 minutes with no observable effect." : undefined,
  })),
  conclusion: "The 1.5x detergent condition gave the highest yield with acceptable clarity; 2x produced excessive foam. Total protein recovery was within 5% of replicate estimates.",
  docLinks: [{ id: uuidv4(), label: "Raw absorbance data", url: "https://example.com/raw-data" }],
  attachments: [],
};

const expRes = await api("/api/experiments", experiment);
console.log("Experiment created:", expRes);

console.log("\nTest data ready. IDs:");
console.log("  Design:", design.id);
console.log("  Experiment:", experiment.id);
