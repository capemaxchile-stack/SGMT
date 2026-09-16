import { BaseEntity, Supplier, Faena, User, Item } from './models';

export type RequestStatus = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CONVERTIDA';

export type OrderStatus =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'APROBADA_EXCEPCION'
  | 'RECHAZADA'
  | 'EMITIDA'
  | 'RECEPCION_PARCIAL'
  | 'RECEPCION_TOTAL'
  | 'CANCELADA';

export interface PurchaseOrderLine extends BaseEntity {
  purchaseOrderId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  item?: Item;
}

export interface PurchaseOrder extends BaseEntity {
  orderNumber: string;
  purchaseRequestId?: string;
  supplierId: string;
  totalAmount: number;
  status: OrderStatus;
  deliveryTerms?: string;
  estimatedDeliveryDate?: string;
  supplier?: Supplier;
  purchaseRequest?: PurchaseRequest;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseRequest extends BaseEntity {
  requestNumber: string;
  faenaId: string;
  requesterId: string;
  status: RequestStatus;
  justification: string;
  faena?: Faena;
  requester?: User;
}

export interface CreatePurchaseOrderLineDto {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  purchaseRequestId?: string;
  deliveryTerms?: string;
  estimatedDeliveryDate?: string;
  lines: CreatePurchaseOrderLineDto[];
}

export interface CreatePurchaseRequestDto {
  requestNumber: string;
  faenaId: string;
  justification: string;
}
