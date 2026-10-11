import { ProcurementAuditService } from './procurement-audit.service';
import { AssetOperationalStatus, OrderStatus, Prisma } from '@prisma/client';

describe('ProcurementAuditService', () => {
  let service: ProcurementAuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      purchaseOrder: {
        findMany: jest.fn(),
      },
      purchaseOrderLine: {
        findMany: jest.fn(),
      },
      warehouseMovementLine: {
        count: jest.fn(),
      },
    };

    service = new ProcurementAuditService(mockPrisma);
  });

  describe('getFraudRadar', () => {
    it('detects purchase order splitting (pitufeo) within 72h below approval threshold', async () => {
      const now = new Date();
      const order1Date = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
      const order2Date = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4h ago

      // 2 orders of $800,000 each (under 1M threshold), totaling $1,600,000 to same supplier
      mockPrisma.purchaseOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'po-1',
            orderNumber: 'OC-202610-0001',
            supplierId: 'sup-1',
            supplier: { businessName: 'Ferretería Industrial' },
            totalAmount: new Prisma.Decimal(800000),
            createdAt: order1Date,
            lines: [],
          },
          {
            id: 'po-2',
            orderNumber: 'OC-202610-0002',
            supplierId: 'sup-1',
            supplier: { businessName: 'Ferretería Industrial' },
            totalAmount: new Prisma.Decimal(800000),
            createdAt: order2Date,
            lines: [],
          },
        ])
        .mockResolvedValueOnce([]); // target asset query empty

      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([]);

      const result = await service.getFraudRadar();

      expect(result.summary.criticalCount).toBeGreaterThanOrEqual(1);
      const splitAnomaly = result.anomalies.find((a) => a.ruleCode === 'SPLIT_PURCHASE');
      expect(splitAnomaly).toBeDefined();
      expect(splitAnomaly?.severity).toBe('CRITICAL');
      expect(splitAnomaly?.evidence.orders).toContain('OC-202610-0001');
      expect(splitAnomaly?.evidence.orders).toContain('OC-202610-0002');
    });

    it('detects price spike greater than 20% compared to historical reference', async () => {
      const olderDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const recentDate = new Date();

      mockPrisma.purchaseOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'po-old',
            orderNumber: 'OC-202609-0010',
            supplierId: 'sup-1',
            supplier: { businessName: 'Finning CAT' },
            totalAmount: new Prisma.Decimal(100000),
            createdAt: olderDate,
            lines: [
              {
                id: 'pol-1',
                itemId: 'item-filter',
                unitPrice: new Prisma.Decimal(10000),
                item: { code: 'FIL-01', description: 'Filtro' },
              },
            ],
          },
          {
            id: 'po-new',
            orderNumber: 'OC-202610-0005',
            supplierId: 'sup-1',
            supplier: { businessName: 'Finning CAT' },
            totalAmount: new Prisma.Decimal(150000),
            createdAt: recentDate,
            lines: [
              {
                id: 'pol-2',
                itemId: 'item-filter',
                unitPrice: new Prisma.Decimal(15000), // +50% increase!
                item: { code: 'FIL-01', description: 'Filtro' },
              },
            ],
          },
        ])
        .mockResolvedValueOnce([]); // target asset query empty

      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([]);

      const result = await service.getFraudRadar();

      const priceAnomaly = result.anomalies.find((a) => a.ruleCode === 'PRICE_SPIKE');
      expect(priceAnomaly).toBeDefined();
      expect(priceAnomaly?.evidence.amounts?.percentageIncrease).toBe(50);
    });

    it('detects direct purchase assigned to decommissioned/inactive asset', async () => {
      mockPrisma.purchaseOrder.findMany
        .mockResolvedValueOnce([]) // general orders query
        .mockResolvedValueOnce([
          {
            id: 'po-inactive',
            orderNumber: 'OC-202610-0099',
            totalAmount: new Prisma.Decimal(5000000),
            createdAt: new Date(),
            supplier: { businessName: 'Komatsu' },
            targetAsset: {
              internalNumber: 'EX-04',
              brand: 'Komatsu',
              model: 'PC200',
              operationalStatus: AssetOperationalStatus.DADO_DE_BAJA,
            },
          },
        ]);

      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([]);

      const result = await service.getFraudRadar();

      const assetAnomaly = result.anomalies.find((a) => a.ruleCode === 'INACTIVE_ASSET');
      expect(assetAnomaly).toBeDefined();
      expect(assetAnomaly?.severity).toBe('CRITICAL');
      expect(assetAnomaly?.evidence.asset).toContain('DADO_DE_BAJA');
    });
  });
});
