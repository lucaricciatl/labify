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

export interface Experiment {
  id: string;
  name: string;
  materials: ExperimentMaterial[];
  instruments: ExperimentInstrument[];
  startingDate: string;
  endingDate: string;
  docLinks?: DocumentLink[];
  attachments?: Attachment[];
}
