-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "TenantPlanTier" AS ENUM ('BASICO', 'PRO', 'ENTERPRISE', 'PERSONALIZADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'PRUEBA', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tenant Table
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "rut" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVO',
  "planTier" "TenantPlanTier" NOT NULL DEFAULT 'PRO',
  "enabledModules" TEXT[] DEFAULT ARRAY['DASHBOARD', 'FAENAS', 'FLOTA', 'CERTIFICACIONES', 'MANTENIMIENTO', 'COMBUSTIBLE', 'BODEGA', 'COMPRAS', 'REPORTES', 'ADMINISTRACION', 'TERRENO']::TEXT[],
  "maxUsers" INTEGER NOT NULL DEFAULT 15,
  "maxAssets" INTEGER NOT NULL DEFAULT 50,
  "maxFaenas" INTEGER NOT NULL DEFAULT 5,
  "maxMonthlyEmails" INTEGER NOT NULL DEFAULT 500,
  "maxMonthlyMessages" INTEGER NOT NULL DEFAULT 1000,
  "maxMonthlyAiTokens" INTEGER NOT NULL DEFAULT 100000,
  "logoUrl" TEXT,
  "themePrimaryColor" TEXT,
  "terminologyConfig" JSONB,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "billingNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_rut_key" ON "Tenant"("rut");

-- 3. Create TenantUsageMetric Table
CREATE TABLE IF NOT EXISTS "TenantUsageMetric" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "billingPeriod" TEXT NOT NULL,
  "emailsSent" INTEGER NOT NULL DEFAULT 0,
  "messagesSent" INTEGER NOT NULL DEFAULT 0,
  "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
  "storageBytes" BIGINT NOT NULL DEFAULT 0,
  "activeAssetsCount" INTEGER NOT NULL DEFAULT 0,
  "activeUsersCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantUsageMetric_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantUsageMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantUsageMetric_tenantId_billingPeriod_key" ON "TenantUsageMetric"("tenantId", "billingPeriod");
CREATE INDEX IF NOT EXISTS "TenantUsageMetric_tenantId_idx" ON "TenantUsageMetric"("tenantId");

-- 4. Seed Default Tenant
INSERT INTO "Tenant" (
  "id", "name", "slug", "rut", "status", "planTier", "enabledModules", "maxUsers", "maxAssets", "maxFaenas", "maxMonthlyEmails", "maxMonthlyMessages", "maxMonthlyAiTokens", "createdAt", "updatedAt"
) VALUES (
  '11111111-1111-4111-a111-111111111111',
  'KATEI Minería Principal',
  'principal',
  '76.962.510-0',
  'ACTIVO',
  'ENTERPRISE',
  ARRAY['DASHBOARD', 'FAENAS', 'FLOTA', 'CERTIFICACIONES', 'MANTENIMIENTO', 'COMBUSTIBLE', 'BODEGA', 'COMPRAS', 'REPORTES', 'ADMINISTRACION', 'TERRENO', 'COPILOT']::TEXT[],
  999, 999, 999, 10000, 20000, 1000000,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- 5. Add tenantId column to existing business entities and backfill
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "User" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

ALTER TABLE "Faena" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Faena" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Faena" ADD CONSTRAINT "Faena_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Faena_tenantId_idx" ON "Faena"("tenantId");

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Asset" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Asset_tenantId_idx" ON "Asset"("tenantId");

ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Warehouse" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Item" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Item" ADD CONSTRAINT "Item_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Item_tenantId_idx" ON "Item"("tenantId");

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Supplier" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Supplier_tenantId_idx" ON "Supplier"("tenantId");

ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "PurchaseRequest" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "PurchaseRequest_tenantId_idx" ON "PurchaseRequest"("tenantId");

ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Quotation" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Quotation_tenantId_idx" ON "Quotation"("tenantId");

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "PurchaseOrder" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "MaintenancePlan" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "MaintenancePlan_tenantId_idx" ON "MaintenancePlan"("tenantId");

ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "WorkOrder" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "WorkOrder_tenantId_idx" ON "WorkOrder"("tenantId");

ALTER TABLE "FuelLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "FuelLog" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "FuelLog_tenantId_idx" ON "FuelLog"("tenantId");

ALTER TABLE "AssetDocument" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "AssetDocument" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "AssetDocument_tenantId_idx" ON "AssetDocument"("tenantId");

ALTER TABLE "OperatorCertification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "OperatorCertification" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "OperatorCertification" ADD CONSTRAINT "OperatorCertification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "OperatorCertification_tenantId_idx" ON "OperatorCertification"("tenantId");

ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Budget" SET "tenantId" = '11111111-1111-4111-a111-111111111111' WHERE "tenantId" IS NULL;
DO $$ BEGIN
  ALTER TABLE "Budget" ADD CONSTRAINT "Budget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "Budget_tenantId_idx" ON "Budget"("tenantId");
