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

export interface FuelLog extends BaseEntity {
  dispatchNumber: string;
  assetId: string;
  faenaId?: string | null;
  warehouseId?: string | null;
  movementId?: string | null;
  liters: number;
  unitPrice: number;
  totalCost: number;
  previousHourmeter: number;
  currentHourmeter: number;
  hourmeterDelta: number;
  litersPerHour: number;
  previousKilometrage: number;
  currentKilometrage: number;
  kilometrageDelta: number;
  kmPerLiter: number;
  operatorName?: string | null;
  fuelTruckPlate?: string | null;
  dispatchTicketNumber?: string | null;
  notes?: string | null;
  createdById: string;
  dispatchDate: string;
  asset?: Asset;
  faena?: Faena | null;
  warehouse?: Warehouse | null;
  createdBy?: User;
}

export interface FuelStats {
  totalLiters: number;
  totalSpend: number;
  totalDispatches: number;
  byAssetType: Record<string, { count: number; totalLiters: number; totalHoursDelta: number; avgLitersPerHour: number }>;
  byFaena: Array<{ name: string; totalLiters: number; totalSpend: number }>;
  recentLogs: FuelLog[];
}

export interface ExecutiveReportKPIs {
  totalOperationalCost: number;
  totalFuelCost: number;
  totalFuelLiters: number;
  avgFuelPricePerLiter: number;
  totalMaintenanceCost: number;
  totalLaborCost: number;
  totalSparePartsCost: number;
  directWarehouseMaterialsCost: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
}

export interface FaenaReportSummary {
  faenaId: string;
  faenaName: string;
  location: string;
  status: FaenaStatus;
  activeAssetsCount: number;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  workOrdersCount: number;
  totalCost: number;
  totalContractAmount: number;
  budgetBurnPercentage: number;
}

export interface AssetReportSummary {
  assetId: string;
  internalNumber: string;
  brand: string;
  model: string;
  type: AssetType;
  currentHourmeter: number;
  currentKilometrage: number;
  currentFaena: string;
  hoursWorked: number;
  kmTraveled: number;
  fuelLiters: number;
  fuelCost: number;
  avgLitersPerHour: number;
  maintenanceCost: number;
  workOrdersCount: number;
  totalCost: number;
  costPerHour: number;
  costPerKm: number;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
}

export interface ExecutiveReport {
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  kpis: ExecutiveReportKPIs;
  faenasSummary: FaenaReportSummary[];
  assetsSummary: AssetReportSummary[];
  monthlyTrends: MonthlyTrend[];
}

export interface WarehouseMovementLine extends BaseEntity {
  movementId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  item?: Item;
}

export interface WarehouseMovement extends BaseEntity {
  type: string;
  movementNumber: string;
  warehouseId: string;
  faenaId?: string | null;
  assetId?: string | null;
  purchaseOrderId?: string | null;
  userId: string;
  notes?: string | null;
  warehouse?: Warehouse;
  faena?: Faena;
  asset?: Asset;
  user?: User;
  lines?: WarehouseMovementLine[];
}

export interface FaenaClosingReport {
  faena: {
    id: string;
    name: string;
    location: string;
    status: FaenaStatus;
    chiefName: string;
    chiefEmail: string;
    contracts: Contract[];
    activeAssets: Array<{
      id: string;
      internalNumber: string;
      brand: string;
      model: string;
      type: AssetType;
      licensePlate?: string;
      currentHourmeter: number;
    }>;
  };
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  totals: {
    totalFuelLiters: number;
    totalFuelCost: number;
    totalMaintenanceCost: number;
    totalLaborCost: number;
    totalSparePartsCost: number;
    totalWarehouseDispatchesCost: number;
    grandTotalCost: number;
    totalContractAmount: number;
    budgetBurnPercentage: number;
  };
  fuelLogs: FuelLog[];
  workOrders: WorkOrder[];
  warehouseMovements: WarehouseMovement[];
}

export interface SystemNotification {
  id: string;
  category: 'COMPRAS' | 'STOCK' | 'MANTENIMIENTO' | 'FLOTA';
  title: string;
  description: string;
  link: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  timestamp: string;
  entityId?: string;
}

export interface NotificationsResponse {
  notifications: SystemNotification[];
  totalCount: number;
  criticalCount: number;
  highCount: number;
}

export interface NotificationEventsConfig {
  radarAlerts: boolean;
  lowStock: boolean;
  pendingApprovals: boolean;
  abnormalFuel: boolean;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
  events: NotificationEventsConfig;
}

export interface BrevoConfig {
  enabled: boolean;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  recipientEmails?: string[];
  events: NotificationEventsConfig;
}

export interface WebhookConfig {
  enabled: boolean;
  url?: string;
  events: NotificationEventsConfig;
}

export interface ScheduleRulesConfig {
  digestFrequency: 'DAILY' | 'HOURLY' | 'REALTIME_ONLY' | 'DISABLED';
  dailyDigestTime?: string;
  enableRealtimeEvents: boolean;
  cooldownPreventDuplicateDaily: boolean;
}

export interface NotificationChannelsConfig {
  telegram: TelegramConfig;
  brevo: BrevoConfig;
  webhook?: WebhookConfig;
  scheduleRules?: ScheduleRulesConfig;
}

export interface TestChannelPayload {
  channel: 'TELEGRAM' | 'BREVO' | 'WEBHOOK';
  telegramConfig?: TelegramConfig;
  brevoConfig?: BrevoConfig;
}

export type AssetDocType =
  | 'REVISION_TECNICA'
  | 'PERMISO_CIRCULACION'
  | 'SEGURO_SOAP'
  | 'SEGURO_DANOS'
  | 'CERTIFICACION_ESTRUCTURAL'
  | 'ANALISIS_GASES'
  | 'CERTIFICADO_HOMOLOGACION'
  | 'OTRO';

export type OperatorDocType =
  | 'LICENCIA_CONDUCIR'
  | 'EXAMEN_OCUPACIONAL'
  | 'INDUCCION_DAS'
  | 'CERTIFICACION_MAQUINARIA'
  | 'CONTRATO_TRABAJO'
  | 'ENTREGA_EPP'
  | 'OTRO';

export type ExpirationStatus =
  | 'VIGENTE'
  | 'POR_VENCER_30'
  | 'POR_VENCER_15'
  | 'CRITICO_5'
  | 'VENCIDO';

export interface AssetDocument extends BaseEntity {
  assetId: string;
  docType: AssetDocType;
  documentNumber?: string | null;
  issuingEntity?: string | null;
  issueDate?: string | null;
  expirationDate: string;
  fileUrl?: string | null;
  notes?: string | null;
  isMandatory: boolean;
  createdById: string;
  status: ExpirationStatus;
  daysRemaining: number;
  asset?: Asset;
  createdBy?: User;
}

export interface OperatorCertification extends BaseEntity {
  operatorName: string;
  rut: string;
  jobTitle?: string | null;
  faenaId?: string | null;
  docType: OperatorDocType;
  documentNumber?: string | null;
  issuingEntity?: string | null;
  issueDate?: string | null;
  expirationDate: string;
  fileUrl?: string | null;
  notes?: string | null;
  createdById: string;
  status: ExpirationStatus;
  daysRemaining: number;
  faena?: Faena | null;
  createdBy?: User;
}

export interface RadarTimelineItem {
  category: 'ASSET' | 'OPERATOR';
  id: string;
  targetId: string;
  title: string;
  subtitle: string;
  docType: string;
  documentNumber?: string | null;
  issuingEntity?: string | null;
  expirationDate: string;
  status: ExpirationStatus;
  daysRemaining: number;
  fileUrl?: string | null;
}

export interface DocumentRadarResponse {
  metrics: {
    totalAssetDocs: number;
    expiredAssetsCount: number;
    criticalAssetsCount: number;
    warningAssetsCount: number;
    totalOperatorCerts: number;
    expiredOperatorsCount: number;
    criticalOperatorsCount: number;
    warningOperatorsCount: number;
    expiredTotal: number;
    criticalTotal: number;
    warningTotal: number;
  };
  radarItems: RadarTimelineItem[];
}




