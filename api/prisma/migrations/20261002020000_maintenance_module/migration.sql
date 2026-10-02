-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WorkOrderType" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'EMERGENCIA', 'PREDICTIVO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkOrderPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkOrderStatus" AS ENUM ('ABIERTA', 'EN_PROGRESO', 'ESPERA_REPUESTOS', 'COMPLETADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable MaintenancePlan
CREATE TABLE IF NOT EXISTS "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "intervalHours" INTEGER,
    "intervalKm" INTEGER,
    "description" TEXT,
    "checklist" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkOrder
CREATE TABLE IF NOT EXISTS "WorkOrder" (
    "id" TEXT NOT NULL,
    "otNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "faenaId" TEXT,
    "maintenancePlanId" TEXT,
    "type" "WorkOrderType" NOT NULL,
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'ABIERTA',
    "description" TEXT NOT NULL,
    "failureReport" TEXT,
    "currentHourmeter" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentKilometrage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "technicianName" TEXT,
    "startDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkOrderItem
CREATE TABLE IF NOT EXISTS "WorkOrderItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "warehouseId" TEXT NOT NULL,
    "movementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_otNumber_key" ON "WorkOrder"("otNumber");
CREATE INDEX IF NOT EXISTS "WorkOrder_assetId_status_idx" ON "WorkOrder"("assetId", "status");
CREATE INDEX IF NOT EXISTS "WorkOrder_faenaId_idx" ON "WorkOrder"("faenaId");
CREATE INDEX IF NOT EXISTS "WorkOrderItem_workOrderId_idx" ON "WorkOrderItem"("workOrderId");

-- AddForeignKeys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_assetId_fkey') THEN
    ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_faenaId_fkey') THEN
    ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_maintenancePlanId_fkey') THEN
    ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_createdById_fkey') THEN
    ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrderItem_workOrderId_fkey') THEN
    ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrderItem_itemId_fkey') THEN
    ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrderItem_warehouseId_fkey') THEN
    ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrderItem_movementId_fkey') THEN
    ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "WarehouseMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
