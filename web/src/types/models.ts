export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Faena extends BaseEntity {
  name: string;
  location: string;
  status: 'NUEVA' | 'EN_FORMACION' | 'ACTIVA' | 'EN_CIERRE' | 'CERRADA';
  chiefAssigned?: string;
  startDate?: string;
  endDate?: string;
  contractsCount: number;
  assetsCount: number;
}

export interface Asset extends BaseEntity {
  internalNumber: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  status: 'OPERATIVO' | 'EN_MANTENCION' | 'DETENIDO';
  currentHorometer: number;
  currentKilometers: number;
  faenaId?: string;
  faenaName?: string;
}

export interface Item extends BaseEntity {
  code: string;
  description: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
}

export interface Warehouse extends BaseEntity {
  name: string;
  type: 'CENTRAL' | 'FAENA';
  location: string;
  faenaId?: string;
}

export interface Supplier extends BaseEntity {
  rut: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
}
