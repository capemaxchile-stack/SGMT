-- 1. Alter PurchaseOrder to add faenaId
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "faenaId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_faenaId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Create Budget table
CREATE TABLE IF NOT EXISTS "Budget" (
  "id" TEXT NOT NULL,
  "faenaId" TEXT NOT NULL,
  "costCenterId" TEXT,
  "year" INTEGER NOT NULL,
  "month" INTEGER,
  "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- Unique index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Budget_faenaId_costCenterId_year_month_key') THEN
    CREATE UNIQUE INDEX "Budget_faenaId_costCenterId_year_month_key" ON "Budget"("faenaId", "costCenterId", "year", "month");
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS "Budget_faenaId_idx" ON "Budget"("faenaId");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Budget_faenaId_fkey') THEN
    ALTER TABLE "Budget" ADD CONSTRAINT "Budget_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Budget_costCenterId_fkey') THEN
    ALTER TABLE "Budget" ADD CONSTRAINT "Budget_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
