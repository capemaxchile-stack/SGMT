import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getCurrentTenantId } from '../common/tenant-context/tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    const TENANT_SCOPED_MODELS = new Set([
      'Asset',
      'Faena',
      'Warehouse',
      'Item',
      'Supplier',
      'PurchaseRequest',
      'PurchaseOrder',
      'Quotation',
      'MaintenancePlan',
      'WorkOrder',
      'FuelLog',
      'AssetDocument',
      'OperatorCertification',
      'Budget',
    ]);

    this.$use(async (params, next) => {
      const tenantId = getCurrentTenantId();
      if (tenantId && params.model) {
        if (TENANT_SCOPED_MODELS.has(params.model)) {
          if (['findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
            params.args = params.args || {};
            params.args.where = { ...params.args.where, tenantId };
          } else if (params.action === 'findFirst') {
            params.args = params.args || {};
            params.args.where = { ...params.args.where, tenantId };
          } else if (params.action === 'findUnique') {
            params.action = 'findFirst';
            params.args.where = { ...params.args.where, tenantId };
          } else if (params.action === 'create') {
            params.args = params.args || {};
            params.args.data = params.args.data || {};
            if (!params.args.data.tenantId) {
              params.args.data.tenantId = tenantId;
            }
          } else if (params.action === 'createMany') {
            params.args = params.args || {};
            if (Array.isArray(params.args.data)) {
              params.args.data.forEach((d: any) => {
                if (!d.tenantId) d.tenantId = tenantId;
              });
            }
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
            params.args = params.args || {};
            params.args.where = { ...params.args.where, tenantId };
          }
        } else if (params.model === 'User' && ['findMany', 'count'].includes(params.action)) {
          if (!params.args?.where?.roles?.some?.role?.name?.includes('SUPER_USUARIO')) {
            params.args = params.args || {};
            params.args.where = { ...params.args.where, tenantId };
          }
        } else if (params.model === 'WarehouseMovement' && ['findMany', 'count', 'findFirst'].includes(params.action)) {
          params.args = params.args || {};
          params.args.where = { ...params.args.where, warehouse: { tenantId } };
        } else if (params.model === 'Stock' && ['findMany', 'count', 'findFirst'].includes(params.action)) {
          params.args = params.args || {};
          params.args.where = { ...params.args.where, warehouse: { tenantId } };
        }
      }
      return next(params);
    });

    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SystemSetting" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "description" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetDocType') THEN
            CREATE TYPE "AssetDocType" AS ENUM (
              'REVISION_TECNICA', 'PERMISO_CIRCULACION', 'SEGURO_SOAP', 'SEGURO_DANOS',
              'CERTIFICACION_ESTRUCTURAL', 'ANALISIS_GASES', 'CERTIFICADO_HOMOLOGACION', 'OTRO'
            );
          END IF;
        END $$;

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperatorDocType') THEN
            CREATE TYPE "OperatorDocType" AS ENUM (
              'LICENCIA_CONDUCIR', 'EXAMEN_OCUPACIONAL', 'INDUCCION_DAS',
              'CERTIFICACION_MAQUINARIA', 'CONTRATO_TRABAJO', 'ENTREGA_EPP', 'OTRO'
            );
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS "AssetDocument" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "OperatorCertification" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Budget" (
          "id" TEXT PRIMARY KEY,
          "faenaId" TEXT NOT NULL,
          "costCenterId" TEXT,
          "year" INTEGER NOT NULL,
          "month" INTEGER,
          "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch {
      // Ignore in mock/test DBs
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
