export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export type FaenaStatus = 'EN_FORMACION' | 'ACTIVA' | 'EN_CIERRE' | 'CERRADA';

export interface User extends BaseEntity {
  name: string;
  email: string;
  isActive: boolean;
}

export interface Contract extends BaseEntity {
  number: string;
  clientName: string;
  amount: number;
  startDate: string;
  endDate?: string;
  faenaId: string;
  costCenters?: CostCenter[];
}

export interface CostCenter extends BaseEntity {
  code: string;
  name: string;
  contractId: string;
}

export interface Faena extends BaseEntity {
  name: string;
  location: string;
  status: FaenaStatus;
  startDate?: string;
  endDate?: string;
  chiefId?: string;
  chief?: User;
  contracts?: Contract[];
  _count?: {
    contracts: number;
    assets: number;
  };
}

export type AssetType =
  | 'EXCAVADORA'
  | 'RETROEXCAVADORA'
  | 'BULLDOZER'
  | 'CAMION_TOLVA'
  | 'CAMION_PLUMA'
  | 'CAMIONETA'
  | 'RODILLO'
  | 'MOTONIVELADORA'
  | 'CARGADOR_FRONTAL'
  | 'OTRO';

export type AssetOperationalStatus = 'OPERATIVO' | 'EN_MANTENCION' | 'DETENIDO' | 'DADO_DE_BAJA';

export interface AssetAssignment extends BaseEntity {
  assetId: string;
  faenaId: string;
  startDate: string;
  endDate?: string;
  faena?: Faena;
}

export interface Asset extends BaseEntity {
  type: AssetType;
  brand: string;
  model: string;
  year: number;
  licensePlate?: string;
  internalNumber: string;
  operationalStatus: AssetOperationalStatus;
  currentHourmeter: number;
  currentKilometrage: number;
  assignments?: AssetAssignment[];
}

export interface Item extends BaseEntity {
  code: string;
  description: string;
  unitOfMeasure: string;
  category: string;
  minimumStock: number;
  isActive: boolean;
  totalStock?: number;
}

export type WarehouseType = 'CENTRAL' | 'FAENA';

export interface Warehouse extends BaseEntity {
  name: string;
  location: string;
  type: WarehouseType;
  isActive: boolean;
  _count?: {
    stocks: number;
    movements: number;
  };
}

export interface Supplier extends BaseEntity {
  businessName: string;
  rut: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
}
