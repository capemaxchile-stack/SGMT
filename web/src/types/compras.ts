import { BaseEntity, Supplier, Faena, User, Item, Asset } from './models';

export type RequestStatus = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CONVERTIDA';
export type RequestUrgency = 'BAJA' | 'NORMAL' | 'ALTA' | 'DETIENE_EQUIPO';

export type QuotationStatus = 'SOLICITADA' | 'RECIBIDA' | 'SELECCIONADA' | 'DESCARTADA' | 'VENCIDA';

export type ReceptionDestination = 'BODEGA' | 'GARITA_TRANSITO' | 'ACTIVO_DIRECTO';

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
  quotationId?: string;
  supplierId: string;
  totalAmount: number;
  status: OrderStatus;
  receptionDestination?: ReceptionDestination;
  targetAssetId?: string;
  workOrderId?: string;
  gateTicketNumber?: string;
  gateEntryDate?: string;
  deliveryTerms?: string;
  estimatedDeliveryDate?: string;
  supplier?: Supplier;
  purchaseRequest?: PurchaseRequest;
  quotation?: Quotation;
  targetAsset?: Asset;
  lines?: PurchaseOrderLine[];
  warehouseMovements?: any[];
}

export interface PurchaseRequestLine extends BaseEntity {
  purchaseRequestId: string;
  itemId: string;
  quantity: number;
  targetAssetId?: string;
  urgency: RequestUrgency;
  notes?: string;
  item?: Item;
  targetAsset?: Asset;
}

export interface PurchaseRequest extends BaseEntity {
  requestNumber: string;
  faenaId: string;
  requesterId: string;
  status: RequestStatus;
  justification: string;
  faena?: Faena;
  requester?: User;
  lines?: PurchaseRequestLine[];
  quotations?: Quotation[];
  purchaseOrder?: PurchaseOrder[];
}

export interface QuotationLine extends BaseEntity {
  quotationId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availabilityDays?: number;
  comments?: string;
  item?: Item;
}

export interface Quotation extends BaseEntity {
  quotationNumber: string;
  purchaseRequestId?: string;
  supplierId: string;
  status: QuotationStatus;
  requestedDate: string;
  validUntil?: string;
  totalAmount: number;
  notes?: string;
  supplier: Supplier;
  purchaseRequest?: PurchaseRequest;
  lines: QuotationLine[];
}

export interface ProcurementInsights {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  unitOfMeasure: string;
  minimumStock: number;
  totalStock: number;
  stockBreakdown: Array<{
    warehouseId: string;
    warehouseName: string;
    location: string;
    quantity: number;
    averageCost: number;
  }>;
  lastPurchase: {
    orderNumber: string;
    unitPrice: number;
    supplierName: string;
    supplierRut: string;
    date: string;
  } | null;
  suppliers: Array<{
    catalogId: string;
    supplierId: string;
    supplierName: string;
    supplierRut: string;
    isExclusive: boolean;
    supplierPartNumber?: string;
    lastPrice: number;
    leadTimeDays: number;
    notes?: string;
  }>;
  supplierCount: number;
  hasExclusiveSupplier: boolean;
  exclusiveSupplier: { id: string; name: string } | null;
  recentQuotes: Array<{
    quotationNumber: string;
    supplierName: string;
    unitPrice: number;
    status: string;
    availabilityDays?: number;
    date: string;
  }>;
  recommendation: string;
  hasEnoughStock: boolean;
}

export interface TimelineEvent {
  step: number;
  phase: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REJECTED';
  badge?: string;
  meta?: Record<string, any>;
}

export interface OrderTimeline {
  orderId?: string;
  requestId?: string;
  orderNumber?: string;
  requestNumber?: string;
  supplier?: string;
  faena?: string;
  requester?: string;
  status: string;
  totalAmount?: number;
  estimatedDeliveryDate?: string;
  destination?: ReceptionDestination;
  timeline: TimelineEvent[];
}

export interface PendingReceptionOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  supplierRut: string;
  status: OrderStatus;
  receptionDestination: ReceptionDestination;
  gateTicketNumber?: string;
  gateEntryDate?: string;
  totalAmount: number;
  estimatedDeliveryDate?: string;
  isOverdue: boolean;
  daysSinceCreation: number;
  faenaName: string;
  itemCount: number;
  lines: Array<{
    itemCode: string;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CreatePurchaseOrderLineDto {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  purchaseRequestId?: string;
  quotationId?: string;
  receptionDestination?: ReceptionDestination;
  targetAssetId?: string;
  workOrderId?: string;
  deliveryTerms?: string;
  estimatedDeliveryDate?: string;
  lines: CreatePurchaseOrderLineDto[];
}

export interface CreateRequestLineDto {
  itemId: string;
  quantity: number;
  targetAssetId?: string;
  urgency?: RequestUrgency;
  notes?: string;
}

export interface CreatePurchaseRequestDto {
  requestNumber?: string;
  faenaId: string;
  justification: string;
  status?: RequestStatus;
  lines?: CreateRequestLineDto[];
}

export interface CreateQuotationDto {
  purchaseRequestId?: string;
  supplierId: string;
  validUntil?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    quantity: number;
    unitPrice?: number;
    availabilityDays?: number;
    comments?: string;
  }>;
}

export interface UpdateQuotationDto {
  status?: QuotationStatus;
  validUntil?: string;
  notes?: string;
  lines?: Array<{
    id?: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    availabilityDays?: number;
    comments?: string;
  }>;
}
