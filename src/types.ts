export interface DocumentLink {
  id: string;
  label: string;
  url: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data?: string;
}

export interface Supplier {
  id: string;
  name: string;
  webpage: string;
}

export interface Material {
  code: string;
  name: string;
  supplierId: string;
  link: string;
  price: number;
  consumable: boolean;
  unit: string;
  image?: string;
  attachments?: Attachment[];
}

export interface Instrument {
  code: string;
  name: string;
  supplierId: string;
  link: string;
  price: number;
  quantity: number;
  image?: string;
  attachments?: Attachment[];
}

export interface Order {
  id: string;
  materialCode: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  batch: string;
  orderedDate: string;
}

export interface InventoryItem {
  id: string;
  materialCode: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  batch: string;
  receivedDate: string;
}

export interface ExperimentMaterial {
  materialCode: string;
  quantityNeeded: number;
  unit?: string;
}

export interface ExperimentInstrument {
  instrumentCode: string;
  quantityNeeded: number;
}

// ─── Design = Protocol / Template ────────────────────────────────
export interface DesignStep {
  id: string;
  order: number;
  title: string;
  description: string;
  durationMinutes?: number;
  safetyNotes?: string;
  expectedResult?: string;
  image?: string; // reference / planned image
  materials: string[]; // material codes for this step
  instruments: string[]; // instrument codes for this step
}

export interface ExperimentDesign {
  id: string;
  name: string;
  objective?: string;
  hypothesis?: string;
  materials: string[]; // material codes
  instruments: string[]; // instrument codes
  steps: DesignStep[];
  conclusion?: string; // expected conclusion
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Experiment = Execution Instance ───────────────────────────
export interface ExperimentStep {
  id: string;
  order: number;
  title: string;
  description: string;
  durationMinutes?: number; // planned
  safetyNotes?: string; // planned
  expectedResult?: string; // planned
  image?: string; // planned reference image
  actualResult?: string; // actual observed result
  deviationNotes?: string; // deviation from plan
  actualImage?: string; // actual photo
  completed: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  designId?: string; // links to the design this experiment follows
  materials: ExperimentMaterial[];
  instruments: ExperimentInstrument[];
  steps: ExperimentStep[]; // copied from design + execution data
  startingDate: string;
  endingDate: string;
  conclusion?: string; // actual conclusion from execution
  docLinks?: DocumentLink[];
  attachments?: Attachment[];
}
