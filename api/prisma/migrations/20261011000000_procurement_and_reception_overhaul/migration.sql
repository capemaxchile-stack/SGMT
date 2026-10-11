-- 1. Create Enums safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestUrgency') THEN
    CREATE TYPE "RequestUrgency" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'DETIENE_EQUIPO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuotationStatus') THEN
    CREATE TYPE "QuotationStatus" AS ENUM ('SOLICITADA', 'RECIBIDA', 'SELECCIONADA', 'DESCARTADA', 'VENCIDA');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceptionDestination') THEN
    CREATE TYPE "ReceptionDestination" AS ENUM ('BODEGA', 'GARITA_TRANSITO', 'ACTIVO_DIRECTO');
  END IF;
END $$;

-- 2. Alter existing tables to add columns safely
ALTER TABLE "WarehouseMovement" ADD COLUMN IF NOT EXISTS "destination" "ReceptionDestination" NOT NULL DEFAULT 'BODEGA';
ALTER TABLE "WarehouseMovement" ADD COLUMN IF NOT EXISTS "gateTicketNumber" TEXT;
ALTER TABLE "WarehouseMovement" ADD COLUMN IF NOT EXISTS "receivedAtGateAt" TIMESTAMP(3);
ALTER TABLE "WarehouseMovement" ADD COLUMN IF NOT EXISTS "workOrderId" TEXT;

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "quotationId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "receptionDestination" "ReceptionDestination" NOT NULL DEFAULT 'BODEGA';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "targetAssetId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "workOrderId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "gateTicketNumber" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "gateEntryDate" TIMESTAMP(3);

-- 3. Create tables
CREATE TABLE IF NOT EXISTS "PurchaseRequestLine" (
  "id" TEXT NOT NULL,
  "purchaseRequestId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "targetAssetId" TEXT,
  "urgency" "RequestUrgency" NOT NULL DEFAULT 'NORMAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseRequestLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierCatalog" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "isExclusive" BOOLEAN NOT NULL DEFAULT false,
  "supplierPartNumber" TEXT,
  "lastPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "leadTimeDays" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Quotation" (
  "id" TEXT NOT NULL,
  "quotationNumber" TEXT NOT NULL,
  "purchaseRequestId" TEXT,
  "supplierId" TEXT NOT NULL,
  "status" "QuotationStatus" NOT NULL DEFAULT 'SOLICITADA',
  "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuotationLine" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "availabilityDays" INTEGER,
  "comments" TEXT,

  CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS "PurchaseRequestLine_purchaseRequestId_idx" ON "PurchaseRequestLine"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "PurchaseRequestLine_itemId_idx" ON "PurchaseRequestLine"("itemId");
CREATE INDEX IF NOT EXISTS "PurchaseRequestLine_targetAssetId_idx" ON "PurchaseRequestLine"("targetAssetId");

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierCatalog_supplierId_itemId_key" ON "SupplierCatalog"("supplierId", "itemId");
CREATE INDEX IF NOT EXISTS "SupplierCatalog_itemId_idx" ON "SupplierCatalog"("itemId");
CREATE INDEX IF NOT EXISTS "SupplierCatalog_supplierId_idx" ON "SupplierCatalog"("supplierId");

CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
CREATE INDEX IF NOT EXISTS "Quotation_purchaseRequestId_idx" ON "Quotation"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "Quotation_supplierId_idx" ON "Quotation"("supplierId");
CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status");

CREATE INDEX IF NOT EXISTS "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");
CREATE INDEX IF NOT EXISTS "QuotationLine_itemId_idx" ON "QuotationLine"("itemId");

-- 5. Foreign Keys safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseMovement_workOrderId_fkey') THEN
    ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_quotationId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_targetAssetId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_workOrderId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequestLine_purchaseRequestId_fkey') THEN
    ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "PurchaseRequestLine_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequestLine_itemId_fkey') THEN
    ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "PurchaseRequestLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequestLine_targetAssetId_fkey') THEN
    ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "PurchaseRequestLine_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierCatalog_supplierId_fkey') THEN
    ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierCatalog_itemId_fkey') THEN
    ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quotation_purchaseRequestId_fkey') THEN
    ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quotation_supplierId_fkey') THEN
    ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuotationLine_quotationId_fkey') THEN
    ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuotationLine_itemId_fkey') THEN
    ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
