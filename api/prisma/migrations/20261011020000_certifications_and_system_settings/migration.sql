-- 1. Create Enums if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetDocType') THEN
    CREATE TYPE "AssetDocType" AS ENUM (
      'REVISION_TECNICA',
      'PERMISO_CIRCULACION',
      'SEGURO_SOAP',
      'SEGURO_DANOS',
      'CERTIFICACION_ESTRUCTURAL',
      'ANALISIS_GASES',
      'CERTIFICADO_HOMOLOGACION',
      'OTRO'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperatorDocType') THEN
    CREATE TYPE "OperatorDocType" AS ENUM (
      'LICENCIA_CONDUCIR',
      'EXAMEN_OCUPACIONAL',
      'INDUCCION_DAS',
      'CERTIFICACION_MAQUINARIA',
      'CONTRATO_TRABAJO',
      'ENTREGA_EPP',
      'OTRO'
    );
  END IF;
END $$;

-- 2. Create SystemSetting table
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- 3. Create AssetDocument table
CREATE TABLE IF NOT EXISTS "AssetDocument" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "docType" "AssetDocType" NOT NULL,
  "documentNumber" TEXT,
  "issuingEntity" TEXT,
  "issueDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3) NOT NULL,
  "fileUrl" TEXT,
  "notes" TEXT,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetDocument_pkey" PRIMARY KEY ("id")
);

-- Indexes for AssetDocument
CREATE INDEX IF NOT EXISTS "AssetDocument_assetId_expirationDate_idx" ON "AssetDocument"("assetId", "expirationDate");
CREATE INDEX IF NOT EXISTS "AssetDocument_expirationDate_idx" ON "AssetDocument"("expirationDate");

-- Foreign Keys for AssetDocument
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetDocument_assetId_fkey') THEN
    ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetDocument_createdById_fkey') THEN
    ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Create OperatorCertification table
CREATE TABLE IF NOT EXISTS "OperatorCertification" (
  "id" TEXT NOT NULL,
  "operatorName" TEXT NOT NULL,
  "rut" TEXT NOT NULL,
  "jobTitle" TEXT,
  "faenaId" TEXT,
  "docType" "OperatorDocType" NOT NULL,
  "documentNumber" TEXT,
  "issuingEntity" TEXT,
  "issueDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3) NOT NULL,
  "fileUrl" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OperatorCertification_pkey" PRIMARY KEY ("id")
);

-- Indexes for OperatorCertification
CREATE INDEX IF NOT EXISTS "OperatorCertification_rut_expirationDate_idx" ON "OperatorCertification"("rut", "expirationDate");
CREATE INDEX IF NOT EXISTS "OperatorCertification_faenaId_idx" ON "OperatorCertification"("faenaId");
CREATE INDEX IF NOT EXISTS "OperatorCertification_expirationDate_idx" ON "OperatorCertification"("expirationDate");

-- Foreign Keys for OperatorCertification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperatorCertification_faenaId_fkey') THEN
    ALTER TABLE "OperatorCertification" ADD CONSTRAINT "OperatorCertification_faenaId_fkey" FOREIGN KEY ("faenaId") REFERENCES "Faena"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperatorCertification_createdById_fkey') THEN
    ALTER TABLE "OperatorCertification" ADD CONSTRAINT "OperatorCertification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
