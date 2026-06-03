import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from "react";
import type { Supplier, Material, Instrument, Experiment, Order, InventoryItem, ExperimentDesign } from "./types";
import { db } from "./db";
import { markDirty, onSyncChange, restoreFromCloud } from "./sync";
import type { SyncStatus } from "./sync";

export interface AppState {
  suppliers: Supplier[];
  materials: Material[];
  instruments: Instrument[];
  experiments: Experiment[];
  experimentDesigns: ExperimentDesign[];
  orders: Order[];
  inventory: InventoryItem[];
  loaded: boolean;
}

const defaultState: AppState = {
  suppliers: [
    { id: "S1", name: "Sigma-Aldrich", webpage: "https://sigmaaldrich.com" },
    { id: "S2", name: "Thermo Fisher", webpage: "https://thermofisher.com" },
    { id: "S3", name: "VWR International", webpage: "https://vwr.com" },
    { id: "S4", name: "Alfa Aesar", webpage: "https://www.alfa.com" },
    { id: "S5", name: "Keysight Technologies", webpage: "https://www.keysight.com" },
    { id: "S6", name: "Keithley Instruments", webpage: "https://www.tek.com/keithley" },
    { id: "S7", name: "Hitachi High-Tech", webpage: "https://www.hitachi-hightech.com" },
    { id: "S8", name: "nanoStrata Inc.", webpage: "https://nanostrata.com" },
    { id: "S9", name: "Malvern PANalytical", webpage: "https://www.malvernpanalytical.com" },
    { id: "S10", name: "In-house / Custom", webpage: "" },
  ],
  materials: [
    { code: "258148", name: "Hydrochloric acid, 37%, ACS reagent", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sigald/258148", price: 0, consumable: true, unit: "mL", image: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/structures/546/395/10e67a13-e4c4-4e30-a1da-32e605ea8bfd/640/10e67a13-e4c4-4e30-a1da-32e605ea8bfd.png" },
    { code: "363146", name: "Poly(vinyl alcohol), Mw 85,000-124,000, 99+% hydrolyzed", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/363146", price: 0, consumable: true, unit: "g", image: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/images/544/865/b778634a-7b1f-480f-94dd-1e1d623492da/640/b778634a-7b1f-480f-94dd-1e1d623492da.jpg" },
    { code: "695068", name: "Hydrofluoric acid, ACS reagent, 48%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sigald/695068", price: 0, consumable: true, unit: "mL", image: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/structures/391/837/6750eed6-a517-44bd-b3e8-0dbd464eb641/640/6750eed6-a517-44bd-b3e8-0dbd464eb641.png" },
    { code: "449903", name: "Lithium fluoride, ≥99.99% trace metals basis", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/449903", price: 0, consumable: true, unit: "g", image: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/structures/475/850/d24265d3-c536-467b-a984-23030296fdab/640/d24265d3-c536-467b-a984-23030296fdab.png" },
    { code: "910767", name: "Titanium aluminium carbide 312, MAX Phase, ≥99.99%, ≤100 μm", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/910767", price: 0, consumable: false, unit: "g", image: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/images/366/535/059be16e-4fe5-48d6-b78a-ba9a9659f37e/640/059be16e-4fe5-48d6-b78a-ba9a9659f37e.jpg" },
    { code: "M-001", name: "Ethanol (96%)", supplierId: "S1", link: "https://sigmaaldrich.com/ethanol", price: 45.99, consumable: true, unit: "mL" },
    { code: "M-002", name: "Petri Dish 90mm", supplierId: "S2", link: "https://thermofisher.com/petridish", price: 12.5, consumable: true, unit: "unit" },
    { code: "M-003", name: "Orbital Shaker", supplierId: "S3", link: "https://vwr.com/agitator", price: 350.0, consumable: false, unit: "unit" },
    { code: "M-004", name: "Titanium carbide (TiC), 99.5%", supplierId: "S4", link: "https://www.alfa.com/titanium-carbide", price: 0, consumable: true, unit: "g" },
    { code: "M-005", name: "Titanium powder, −325 mesh, 99.5%", supplierId: "S4", link: "https://www.alfa.com/titanium-powder", price: 0, consumable: true, unit: "g" },
    { code: "M-006", name: "Aluminum powder, −325 mesh, 99.5%", supplierId: "S4", link: "https://www.alfa.com/aluminum-powder", price: 0, consumable: true, unit: "g" },
    { code: "M-007", name: "Lithium fluoride (LiF), 98.5%, etching grade", supplierId: "S4", link: "https://www.alfa.com/lithium-fluoride", price: 0, consumable: true, unit: "g" },
    { code: "M-008", name: "Acetone, ≥99.5%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sial/179124", price: 0, consumable: true, unit: "mL" },
    { code: "M-009", name: "Isopropyl alcohol (IPA), ≥99.5%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sial/190764", price: 0, consumable: true, unit: "mL" },
    { code: "M-010", name: "Tris(3-aminopropyl)amine (TAPA), 98%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/496347", price: 0, consumable: true, unit: "mL" },
    { code: "M-011", name: "Tris(2-aminoethyl)amine (TAEA), 96%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/225630", price: 0, consumable: true, unit: "mL" },
    { code: "M-012", name: "Polyethylenimine (PEI), branched, average Mw ~25,000", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/408727", price: 0, consumable: true, unit: "mL" },
    { code: "M-013", name: "Poly(methyl methacrylate) (PMMA), average Mw ~996,000", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/182230", price: 0, consumable: true, unit: "g" },
    { code: "M-014", name: "Toluene, ACS reagent, ≥99.5%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sial/244511", price: 0, consumable: true, unit: "mL" },
    { code: "M-015", name: "Poly(vinyl alcohol) (PVA), Mw 89,000–98,000, 99+% hydrolyzed", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/aldrich/363138", price: 0, consumable: true, unit: "g" },
    { code: "M-016", name: "Sulfuric acid (H2SO4), ≥95–98%", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/product/sial/258105", price: 0, consumable: true, unit: "mL" },
    { code: "M-017", name: "Deionized water (DI / Type I)", supplierId: "S3", link: "https://vwr.com/di-water", price: 0, consumable: true, unit: "mL" },
    { code: "M-018", name: "Argon gas (Ar), high purity", supplierId: "S4", link: "https://www.alfa.com/argon", price: 0, consumable: true, unit: "L" },
    { code: "M-019", name: "Glass substrate with patterned Au electrodes", supplierId: "S2", link: "https://thermofisher.com/substrates", price: 0, consumable: true, unit: "unit" },
    { code: "M-020", name: "Adhesive tape (Kapton / polyimide)", supplierId: "S3", link: "https://vwr.com/tape", price: 0, consumable: true, unit: "unit" },
    { code: "M-021", name: "Delaminated Ti3C2Tx MXene aqueous solution (0.5 g/L)", supplierId: "S1", link: "https://www.sigmaaldrich.com/US/en/search/ti3c2tx", price: 0, consumable: true, unit: "mL" },
    { code: "M-022", name: "Ti3AlC2 MAX phase powder, ≤38 μm", supplierId: "S10", link: "", price: 0, consumable: true, unit: "g" },
  ],
  instruments: [
    { code: "I-001", name: "Inverted Microscope", supplierId: "S2", link: "https://thermofisher.com/microscope", price: 1200.0, quantity: 1, image: "/assets/tools/01_Inverted_Microscope.png" },
    { code: "I-002", name: "Benchtop Centrifuge", supplierId: "S1", link: "https://sigmaaldrich.com/centrifuge", price: 450.0, quantity: 1, image: "/assets/tools/02_Benchtop_Centrifuge.png" },
    { code: "I-003", name: "Tube Furnace (1400°C, Ar atmosphere)", supplierId: "S3", link: "https://vwr.com/tube-furnace", price: 8500.0, quantity: 1, image: "/assets/tools/03_Tube_Furnace__1400_C__Ar_atmosphere_.png" },
    { code: "I-004", name: "Probe Sonicator (750W, ice bath compatible)", supplierId: "S3", link: "https://vwr.com/probe-sonicator", price: 3200.0, quantity: 1, image: "/assets/tools/04_Probe_Sonicator__750W__ice_bath_compatib.png" },
    { code: "I-005", name: "Vacuum Oven", supplierId: "S3", link: "https://vwr.com/vacuum-oven", price: 2800.0, quantity: 1, image: "/assets/tools/05_Vacuum_Oven.png" },
    { code: "I-006", name: "Field Emission SEM (Hitachi S4800)", supplierId: "S7", link: "https://www.hitachi-hightech.com/products/sem/s4800", price: 450000.0, quantity: 1, image: "/assets/tools/06_Field_Emission_SEM__Hitachi_S4800_.png" },
    { code: "I-007", name: "XRD Diffractometer (PANalytical X'Pert PRO)", supplierId: "S9", link: "https://www.malvernpanalytical.com/xpert-pro", price: 120000.0, quantity: 1, image: "/assets/tools/07_XRD_Diffractometer__PANalytical_X_Pert_P.png" },
    { code: "I-008", name: "Atomic Force Microscope (AFM)", supplierId: "S2", link: "https://thermofisher.com/afm", price: 95000.0, quantity: 1, image: "/assets/tools/08_Atomic_Force_Microscope__AFM_.png" },
    { code: "I-009", name: "Semiconductor Parameter Analyzer (Keithley 4200A-SCS)", supplierId: "S6", link: "https://www.tek.com/keithley/4200a-scs", price: 65000.0, quantity: 1, image: "/assets/tools/09_Semiconductor_Parameter_Analyzer__Keithl.png" },
    { code: "I-010", name: "Source-Measure Unit (Keithley 2600)", supplierId: "S6", link: "https://www.tek.com/keithley/2600", price: 18000.0, quantity: 1, image: "/assets/tools/10_Source-Measure_Unit__Keithley_2600_.png" },
    { code: "I-011", name: "Waveform Generator (Keysight 33522B, 30 MHz)", supplierId: "S5", link: "https://www.keysight.com/33522b", price: 5500.0, quantity: 2, image: "/assets/tools/11_Waveform_Generator__Keysight_33522B__30_.png" },
    { code: "I-012", name: "Digital Oscilloscope (Keysight DSOS054A, 500 MHz)", supplierId: "S5", link: "https://www.keysight.com/dsos054a", price: 28000.0, quantity: 1, image: "/assets/tools/12_Digital_Oscilloscope__Keysight_DSOS054A_.png" },
    { code: "I-013", name: "Dip-Coating / LbL Robot (StratoSequence VI)", supplierId: "S8", link: "https://nanostrata.com/StratoSequence", price: 45000.0, quantity: 1, image: "/assets/tools/13_Dip-Coating___LbL_Robot__StratoSequence_.png" },
    { code: "I-014", name: "O2 Plasma Cleaner (Optrel GBR, Multi-stop)", supplierId: "S3", link: "https://vwr.com/plasma-cleaner", price: 12000.0, quantity: 1, image: "/assets/tools/14_O2_Plasma_Cleaner__Optrel_GBR__Multi-sto.png" },
    { code: "I-015", name: "Vacuum Probe Station (LTMP-4, MMR Technologies)", supplierId: "S3", link: "https://vwr.com/probe-station", price: 85000.0, quantity: 1, image: "/assets/tools/15_Vacuum_Probe_Station__LTMP-4__MMR_Techno.png" },
  ],
  experiments: [
    {
      id: "EXP-20250530-01",
      name: "Cell Culture Protocol",
      designId: "",
      steps: [],
      materials: [
        { materialCode: "M-001", quantityNeeded: 2, unit: "mL" },
        { materialCode: "M-002", quantityNeeded: 10, unit: "unit" },
      ],
      instruments: [
        { instrumentCode: "I-001", quantityNeeded: 1 },
      ],
      startingDate: "2025-05-01",
      endingDate: "2025-05-04",
      docLinks: [
        { id: "dl1", label: "Cell Culture SOP", url: "https://www.sigmaaldrich.com/cell-culture-sop" },
        { id: "dl2", label: "Media Prep Guide", url: "https://www.thermofisher.com/media-prep" },
      ],
    },
    {
      id: "EXP-20250530-02",
      name: "Protein Extraction",
      designId: "",
      steps: [],
      materials: [{ materialCode: "M-001", quantityNeeded: 5, unit: "mL" }],
      instruments: [
        { instrumentCode: "I-002", quantityNeeded: 1 },
      ],
      startingDate: "2025-05-10",
      endingDate: "2025-05-10",
      docLinks: [
        { id: "dl3", label: "RIPA Buffer Protocol", url: "https://www.sigmaaldrich.com/ripa-protocol" },
      ],
    },
    {
      id: "EXP-20250630-01",
      name: "Ti3AlC2 MAX Phase Synthesis",
      designId: "",
      steps: [],
      materials: [
        { materialCode: "M-004", quantityNeeded: 2, unit: "g" },
        { materialCode: "M-005", quantityNeeded: 1, unit: "g" },
        { materialCode: "M-006", quantityNeeded: 1, unit: "g" },
        { materialCode: "M-018", quantityNeeded: 1, unit: "L" },
      ],
      instruments: [
        { instrumentCode: "I-003", quantityNeeded: 1 },
      ],
      startingDate: "2025-06-01",
      endingDate: "2025-06-02",
      docLinks: [
        { id: "dl-max-1", label: "Paper: High-Speed Ionic Synaptic Memory", url: "https://onlinelibrary.wiley.com/doi/10.1002/adfm.202109970" },
        { id: "dl-max-2", label: "MILD Method Protocol (Alhabeb et al.)", url: "https://pubs.acs.org/doi/10.1021/acs.chemmater.7b02847" },
      ],
    },
    {
      id: "EXP-20250630-02",
      name: "Ti3C2Tx MXene Etching & Delamination",
      designId: "",
      steps: [],
      materials: [
        { materialCode: "M-022", quantityNeeded: 1, unit: "g" },
        { materialCode: "258148", quantityNeeded: 20, unit: "mL" },
        { materialCode: "M-007", quantityNeeded: 1.6, unit: "g" },
        { materialCode: "M-017", quantityNeeded: 500, unit: "mL" },
        { materialCode: "M-018", quantityNeeded: 1, unit: "L" },
      ],
      instruments: [
        { instrumentCode: "I-004", quantityNeeded: 1 },
        { instrumentCode: "I-002", quantityNeeded: 1 },
      ],
      startingDate: "2025-06-03",
      endingDate: "2025-06-05",
      docLinks: [
        { id: "dl-mxene-1", label: "Paper: High-Speed Ionic Synaptic Memory", url: "https://onlinelibrary.wiley.com/doi/10.1002/adfm.202109970" },
        { id: "dl-mxene-2", label: "MILD Method Protocol (Alhabeb et al.)", url: "https://pubs.acs.org/doi/10.1021/acs.chemmater.7b02847" },
      ],
    },
    {
      id: "EXP-20250630-03",
      name: "MXene-ECRAM Synaptic Memory Device Fabrication",
      designId: "",
      steps: [],
      materials: [
        { materialCode: "M-021", quantityNeeded: 50, unit: "mL" },
        { materialCode: "M-010", quantityNeeded: 0.5, unit: "g" },
        { materialCode: "M-011", quantityNeeded: 0.5, unit: "g" },
        { materialCode: "M-012", quantityNeeded: 0.5, unit: "g" },
        { materialCode: "M-015", quantityNeeded: 1, unit: "g" },
        { materialCode: "M-016", quantityNeeded: 3, unit: "mL" },
        { materialCode: "M-013", quantityNeeded: 1, unit: "g" },
        { materialCode: "M-014", quantityNeeded: 10, unit: "mL" },
        { materialCode: "M-008", quantityNeeded: 50, unit: "mL" },
        { materialCode: "M-001", quantityNeeded: 50, unit: "mL" },
        { materialCode: "M-009", quantityNeeded: 50, unit: "mL" },
        { materialCode: "M-017", quantityNeeded: 100, unit: "mL" },
        { materialCode: "M-019", quantityNeeded: 2, unit: "unit" },
        { materialCode: "M-020", quantityNeeded: 1, unit: "unit" },
      ],
      instruments: [
        { instrumentCode: "I-014", quantityNeeded: 1 },
        { instrumentCode: "I-013", quantityNeeded: 1 },
        { instrumentCode: "I-005", quantityNeeded: 1 },
        { instrumentCode: "I-006", quantityNeeded: 1 },
        { instrumentCode: "I-007", quantityNeeded: 1 },
        { instrumentCode: "I-008", quantityNeeded: 1 },
        { instrumentCode: "I-009", quantityNeeded: 1 },
        { instrumentCode: "I-010", quantityNeeded: 1 },
        { instrumentCode: "I-011", quantityNeeded: 2 },
        { instrumentCode: "I-012", quantityNeeded: 1 },
        { instrumentCode: "I-015", quantityNeeded: 1 },
      ],
      startingDate: "2025-06-10",
      endingDate: "2025-06-20",
      docLinks: [
        { id: "dl-ecram-1", label: "Paper: High-Speed Ionic Synaptic Memory", url: "https://onlinelibrary.wiley.com/doi/10.1002/adfm.202109970" },
        { id: "dl-ecram-2", label: "LbL Self-Assembly Protocol", url: "https://www.nature.com/articles/s41467-019-10355-8" },
      ],
    },
  ],
  orders: [
    { id: "O1", materialCode: "M-001", supplierId: "S1", quantity: 50, unitPrice: 42.50, batch: "B2025-A", orderedDate: "2025-05-15" },
    { id: "O2", materialCode: "M-002", supplierId: "S2", quantity: 200, unitPrice: 11.00, batch: "B2025-B", orderedDate: "2025-05-16" },
  ],
  inventory: [
    { id: "IV1", materialCode: "M-003", supplierId: "S3", quantity: 2, unitPrice: 350.0, batch: "B2025-C", receivedDate: "2025-05-01" },
  ],
  experimentDesigns: [],
  loaded: false,
};

type Action =
  | { type: "HYDRATE"; payload: Partial<AppState> }
  | { type: "ADD_SUPPLIER"; payload: Supplier }
  | { type: "UPDATE_SUPPLIER"; payload: Supplier }
  | { type: "DELETE_SUPPLIER"; payload: string }
  | { type: "ADD_MATERIAL"; payload: Material }
  | { type: "UPDATE_MATERIAL"; payload: Material }
  | { type: "DELETE_MATERIAL"; payload: string }
  | { type: "ADD_INSTRUMENT"; payload: Instrument }
  | { type: "UPDATE_INSTRUMENT"; payload: Instrument }
  | { type: "DELETE_INSTRUMENT"; payload: string }
  | { type: "ADD_EXPERIMENT"; payload: Experiment }
  | { type: "UPDATE_EXPERIMENT"; payload: Experiment }
  | { type: "DELETE_EXPERIMENT"; payload: string }
  | { type: "ADD_EXPERIMENT_DESIGN"; payload: ExperimentDesign }
  | { type: "UPDATE_EXPERIMENT_DESIGN"; payload: ExperimentDesign }
  | { type: "DELETE_EXPERIMENT_DESIGN"; payload: string }
  | { type: "ADD_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER"; payload: Order }
  | { type: "DELETE_ORDER"; payload: string }
  | { type: "ADD_INVENTORY"; payload: InventoryItem }
  | { type: "UPDATE_INVENTORY"; payload: InventoryItem }
  | { type: "DELETE_INVENTORY"; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload as AppState, loaded: true };
    case "ADD_SUPPLIER":
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case "UPDATE_SUPPLIER":
      return { ...state, suppliers: state.suppliers.map((s) => s.id === action.payload.id ? action.payload : s) };
    case "DELETE_SUPPLIER":
      return { ...state, suppliers: state.suppliers.filter((s) => s.id !== action.payload) };
    case "ADD_MATERIAL":
      return { ...state, materials: [...state.materials, action.payload] };
    case "UPDATE_MATERIAL":
      return { ...state, materials: state.materials.map((m) => m.code === action.payload.code ? action.payload : m) };
    case "DELETE_MATERIAL":
      return { ...state, materials: state.materials.filter((m) => m.code !== action.payload) };
    case "ADD_INSTRUMENT":
      return { ...state, instruments: [...state.instruments, action.payload] };
    case "UPDATE_INSTRUMENT":
      return { ...state, instruments: state.instruments.map((i) => i.code === action.payload.code ? action.payload : i) };
    case "DELETE_INSTRUMENT":
      return { ...state, instruments: state.instruments.filter((i) => i.code !== action.payload) };
    case "ADD_EXPERIMENT":
      return { ...state, experiments: [...state.experiments, action.payload] };
    case "UPDATE_EXPERIMENT":
      return { ...state, experiments: state.experiments.map((e) => e.id === action.payload.id ? action.payload : e) };
    case "DELETE_EXPERIMENT":
      return { ...state, experiments: state.experiments.filter((e) => e.id !== action.payload) };
    case "ADD_EXPERIMENT_DESIGN":
      return { ...state, experimentDesigns: [...state.experimentDesigns, action.payload] };
    case "UPDATE_EXPERIMENT_DESIGN":
      return { ...state, experimentDesigns: state.experimentDesigns.map((d) => d.id === action.payload.id ? action.payload : d) };
    case "DELETE_EXPERIMENT_DESIGN":
      return { ...state, experimentDesigns: state.experimentDesigns.filter((d) => d.id !== action.payload) };
    case "ADD_ORDER":
      return { ...state, orders: [...state.orders, action.payload] };
    case "UPDATE_ORDER":
      return { ...state, orders: state.orders.map((o) => o.id === action.payload.id ? action.payload : o) };
    case "DELETE_ORDER":
      return { ...state, orders: state.orders.filter((o) => o.id !== action.payload) };
    case "ADD_INVENTORY":
      return { ...state, inventory: [...state.inventory, action.payload] };
    case "UPDATE_INVENTORY":
      return { ...state, inventory: state.inventory.map((i) => i.id === action.payload.id ? action.payload : i) };
    case "DELETE_INVENTORY":
      return { ...state, inventory: state.inventory.filter((i) => i.id !== action.payload) };
    default:
      return state;
  }
}

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refresh: () => Promise<void>;
  syncStatus: SyncStatus;
} | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false, lastMessage: "", connected: false });

  useEffect(() => {
    const unsubscribe = onSyncChange(setSyncStatus);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (state.loaded) {
      markDirty(state);
    }
  }, [state.suppliers.length, state.materials.length, state.instruments.length, state.experiments.length, state.experimentDesigns.length, state.orders.length, state.inventory.length, state.loaded]);

  const load = async () => {
    try {
      const cloud = await restoreFromCloud();
      if (cloud) {
        await Promise.all(cloud.suppliers?.map((s: Supplier) => db.putSupplier(s)) ?? []);
        await Promise.all(cloud.materials?.map((m: Material) => db.putMaterial(m)) ?? []);
        await Promise.all(cloud.instruments?.map((i: Instrument) => db.putInstrument(i)) ?? []);
        await Promise.all(cloud.experiments?.map((e: Experiment) => db.putExperiment(e)) ?? []);
        await Promise.all(cloud.orders?.map((o: Order) => db.putOrder(o)) ?? []);
        await Promise.all(cloud.experimentDesigns?.map((d: ExperimentDesign) => db.putExperimentDesign(d)) ?? []);
      }

      const [suppliers, materials, instruments, experiments, experimentDesigns, orders, inventory] = await Promise.all([
        db.getAllSuppliers(),
        db.getAllMaterials(),
        db.getAllInstruments(),
        db.getAllExperiments(),
        db.getAllExperimentDesigns(),
        db.getAllOrders(),
        db.getAllInventory(),
      ]);

      // Migration: re-seed instruments if they are missing images
      const instrumentsNeedImages = instruments.length > 0 && instruments.some((i) => !i.image);
      if (instrumentsNeedImages) {
        await db.clearAll();
        await Promise.all(defaultState.suppliers.map((s) => db.putSupplier(s)));
        await Promise.all(defaultState.materials.map((m) => db.putMaterial(m)));
        await Promise.all(defaultState.instruments.map((i) => db.putInstrument(i)));
        await Promise.all(defaultState.experiments.map((e) => db.putExperiment(e)));
        await Promise.all(defaultState.orders.map((o) => db.putOrder(o)));
        await Promise.all(defaultState.inventory.map((iv) => db.putInventoryItem(iv)));
        dispatch({ type: "HYDRATE", payload: { ...defaultState, loaded: true } });
        return;
      }

      if (suppliers.length || materials.length || instruments.length || experiments.length || experimentDesigns.length || orders.length || inventory.length) {
        dispatch({ type: "HYDRATE", payload: { suppliers, materials, instruments, experiments, experimentDesigns, orders, inventory, loaded: true } });
      } else {
        await Promise.all(defaultState.suppliers.map((s) => db.putSupplier(s)));
        await Promise.all(defaultState.materials.map((m) => db.putMaterial(m)));
        await Promise.all(defaultState.instruments.map((i) => db.putInstrument(i)));
        await Promise.all(defaultState.experiments.map((e) => db.putExperiment(e)));
        await Promise.all(defaultState.orders.map((o) => db.putOrder(o)));
        await Promise.all(defaultState.inventory.map((iv) => db.putInventoryItem(iv)));
        dispatch({ type: "HYDRATE", payload: { loaded: true } });
      }
    } catch {
      dispatch({ type: "HYDRATE", payload: { loaded: true } });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, refresh, syncStatus }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function useSupplierActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (s: Supplier) => { await db.putSupplier(s); dispatch({ type: "ADD_SUPPLIER", payload: s }); }, [dispatch]),
    update: useCallback(async (s: Supplier) => { await db.putSupplier(s); dispatch({ type: "UPDATE_SUPPLIER", payload: s }); }, [dispatch]),
    remove: useCallback(async (id: string) => { await db.deleteSupplier(id); dispatch({ type: "DELETE_SUPPLIER", payload: id }); }, [dispatch]),
  };
}

export function useMaterialActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (m: Material) => { await db.putMaterial(m); dispatch({ type: "ADD_MATERIAL", payload: m }); }, [dispatch]),
    update: useCallback(async (m: Material) => { await db.putMaterial(m); dispatch({ type: "UPDATE_MATERIAL", payload: m }); }, [dispatch]),
    remove: useCallback(async (code: string) => { await db.deleteMaterial(code); dispatch({ type: "DELETE_MATERIAL", payload: code }); }, [dispatch]),
  };
}

export function useInstrumentActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (i: Instrument) => { await db.putInstrument(i); dispatch({ type: "ADD_INSTRUMENT", payload: i }); }, [dispatch]),
    update: useCallback(async (i: Instrument) => { await db.putInstrument(i); dispatch({ type: "UPDATE_INSTRUMENT", payload: i }); }, [dispatch]),
    remove: useCallback(async (code: string) => { await db.deleteInstrument(code); dispatch({ type: "DELETE_INSTRUMENT", payload: code }); }, [dispatch]),
  };
}

export function useExperimentActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (e: Experiment) => { await db.putExperiment(e); dispatch({ type: "ADD_EXPERIMENT", payload: e }); }, [dispatch]),
    update: useCallback(async (e: Experiment) => { await db.putExperiment(e); dispatch({ type: "UPDATE_EXPERIMENT", payload: e }); }, [dispatch]),
    remove: useCallback(async (id: string) => { await db.deleteExperiment(id); dispatch({ type: "DELETE_EXPERIMENT", payload: id }); }, [dispatch]),
  };
}

export function useOrderActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (o: Order) => { await db.putOrder(o); dispatch({ type: "ADD_ORDER", payload: o }); }, [dispatch]),
    update: useCallback(async (o: Order) => { await db.putOrder(o); dispatch({ type: "UPDATE_ORDER", payload: o }); }, [dispatch]),
    remove: useCallback(async (id: string) => { await db.deleteOrder(id); dispatch({ type: "DELETE_ORDER", payload: id }); }, [dispatch]),
  };
}

export function useInventoryActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (i: InventoryItem) => { await db.putInventoryItem(i); dispatch({ type: "ADD_INVENTORY", payload: i }); }, [dispatch]),
    update: useCallback(async (i: InventoryItem) => { await db.putInventoryItem(i); dispatch({ type: "UPDATE_INVENTORY", payload: i }); }, [dispatch]),
    remove: useCallback(async (id: string) => { await db.deleteInventoryItem(id); dispatch({ type: "DELETE_INVENTORY", payload: id }); }, [dispatch]),
  };
}

export function useExperimentDesignActions() {
  const { dispatch } = useStore();
  return {
    add: useCallback(async (d: ExperimentDesign) => { await db.putExperimentDesign(d); dispatch({ type: "ADD_EXPERIMENT_DESIGN", payload: d }); }, [dispatch]),
    update: useCallback(async (d: ExperimentDesign) => { await db.putExperimentDesign(d); dispatch({ type: "UPDATE_EXPERIMENT_DESIGN", payload: d }); }, [dispatch]),
    remove: useCallback(async (id: string) => { await db.deleteExperimentDesign(id); dispatch({ type: "DELETE_EXPERIMENT_DESIGN", payload: id }); }, [dispatch]),
  };
}

export function generateExperimentId(experiments: Experiment[]): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `EXP-${yyyy}${mm}${dd}-`;
  let max = 0;
  for (const ex of experiments) {
    if (ex.id.startsWith(prefix)) {
      const num = parseInt(ex.id.replace(prefix, ""), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export function generateOrderId(): string {
  const now = new Date();
  const ts = String(now.getTime()).slice(-6);
  return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${ts}`;
}
