import { BaseEntity, Faena, Asset, Item, Warehouse, User } from './models';

export type MovementType = 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'TRANSFER';

export interface MovementLine extends BaseEntity {
  movementId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  item?: Item;
}

export interface Movement extends BaseEntity {
  type: MovementType;
  movementNumber: string;
  warehouseId: string;
  faenaId?: string;
  assetId?: string;
  purchaseOrderId?: string;
  userId: string;
  notes?: string;
  warehouse?: Warehouse;
  faena?: Faena;
  asset?: Asset;
  user?: User;
  lines?: MovementLine[];
}

export interface CreateMovementLineDto {
  itemId: string;
  quantity: number;
  unitCost?: number;
}

export interface CreateMovementDto {
  type: MovementType;
  warehouseId: string;
  faenaId?: string;
  assetId?: string;
  purchaseOrderId?: string;
  notes?: string;
  lines: CreateMovementLineDto[];
}

export interface KardexMovement {
  id?: string;
  movementNumber?: string;
  type?: MovementType;
  createdAt?: string;
  warehouseId?: string;
  targetWarehouseId?: string;
  warehouse?: { id: string; name: string };
  targetWarehouse?: { id: string; name: string };
  user?: { id: string; name: string };
}

export interface KardexEntry {
  id?: string;
  movementId?: string;
  itemId?: string;
  movementNumber?: string;
  date?: string;
  type?: MovementType;
  quantity: number;
  balance: number;
  unitCost: number;
  totalCost?: number;
  warehouseId?: string;
  warehouseName?: string;
  entries?: number;
  exits?: number;
  notes?: string;
  movement?: KardexMovement;
}
