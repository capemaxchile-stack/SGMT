import { BaseEntity, Faena, Asset, Item, Warehouse, User } from './models';

export type MovementType = 'INGRESO' | 'SALIDA' | 'AJUSTE';

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

export interface KardexEntry {
  date: string;
  movementNumber: string;
  type: MovementType;
  warehouseName: string;
  entries: number;
  exits: number;
  balance: number;
  unitCost: number;
  notes?: string;
}
