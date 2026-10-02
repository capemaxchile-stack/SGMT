export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export type FaenaStatus = 'EN_FORMACION' | 'ACTIVA' | 'EN_CIERRE' | 'CERRADA';

export interface Role extends BaseEntity {
  name: string;
  displayName: string;
  level: number;
  maxApprovalAmount?: number | null;
}

export interface UserRole {
  userId?: string;
  roleId?: string;
  id?: string;
  name?: string;
  role?: Role;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  isActive: boolean;
  roles?: (UserRole | string)[];
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

export const ITEM_CATEGORIES = ['COMBUSTIBLE', 'LUBRICANTE', 'REPUESTO', 'FILTRO', 'FERRETERIA', 'EPP', 'HERRAMIENTA', 'DESGASTE', 'OTRO'] as const;
export type ItemCategory = typeof ITEM_CATEGORIES[number];

export interface Item extends BaseEntity {
  code: string;
  description: string;
  unitOfMeasure: string;
  category: ItemCategory | string;
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

export type WorkOrderType = 'PREVENTIVO' | 'CORRECTIVO' | 'EMERGENCIA' | 'PREDICTIVO';
export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type WorkOrderStatus = 'ABIERTA' | 'EN_PROGRESO' | 'ESPERA_REPUESTOS' | 'COMPLETADA' | 'CANCELADA';

export interface MaintenancePlan extends BaseEntity {
  assetType: AssetType;
  name: string;
  intervalHours?: number | null;
  intervalKm?: number | null;
  description?: string | null;
  checklist?: string[] | null;
  isActive: boolean;
  _count?: {
    workOrders: number;
  };
}

export interface WorkOrderItem extends BaseEntity {
  workOrderId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warehouseId: string;
  movementId?: string | null;
  item?: Item;
  warehouse?: Warehouse;
}

export interface WorkOrder extends BaseEntity {
  otNumber: string;
  assetId: string;
  faenaId?: string | null;
  maintenancePlanId?: string | null;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  description: string;
  failureReport?: string | null;
  currentHourmeter: number;
  currentKilometrage: number;
  technicianName?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
  totalCost: number;
  notes?: string | null;
  createdById: string;
  asset?: Asset;
  faena?: Faena | null;
  maintenancePlan?: MaintenancePlan | null;
  createdBy?: User;
  items?: WorkOrderItem[];
  _count?: {
    items: number;
  };
}

export interface MaintenanceAlert {
  assetId: string;
  internalNumber: string;
  brand: string;
  model: string;
  type: AssetType;
  operationalStatus: AssetOperationalStatus;
  faena: string;
  planId: string;
  planName: string;
  metricType: 'HORAS' | 'KILOMETROS';
  interval: number;
  currentValue: number;
  remainingValue: number;
  percentUsed: number;
  alertLevel: 'NORMAL' | 'PROXIMO' | 'VENCIDO';
}

