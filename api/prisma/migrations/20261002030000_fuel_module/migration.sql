-- CreateTable FuelLog
CREATE TABLE IF NOT EXISTS "FuelLog" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "faenaId" TEXT,
    "warehouseId" TEXT,
    "movementId" TEXT,
    "liters" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "previousHourmeter" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentHourmeter" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hourmeterDelta" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "litersPerHour" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "previousKilometrage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentKilometrage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kilometrageDelta" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kmPerLiter" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "operatorName" TEXT,
    "fuelTruckPlate" TEXT,
    "dispatchTicketNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FuelLog_dispatchNumber_key" ON "FuelLog"("dispatchNumber");
CREATE INDEX IF NOT EXISTS "FuelLog_assetId_dispatchDate_idx" ON "FuelLog"("assetId", "dispatchDate");
CREATE INDEX IF NOT EXISTS "FuelLog_faenaId_idx" ON "FuelLog"("faenaId");

-- AddForeignKeys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelLog_assetId_fkey') THEN
    ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelLog_faenaId_fkey') THEN
    ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelLog_warehouseId_fkey') THEN
    ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelLog_movementId_fkey') THEN
    ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "WarehouseMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelLog_createdById_fkey') THEN
    ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
