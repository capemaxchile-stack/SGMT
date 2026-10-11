import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QuotationStatus, OrderStatus, Prisma } from '@prisma/client';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    quotation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    quotationLine: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
    },
    supplierCatalog: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    item: {
      findUnique: jest.fn(),
    },
    purchaseOrderLine: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    $executeRaw: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getItemProcurementInsights', () => {
    it('should return stock, last purchase price, and exclusive supplier recommendation', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-1',
        code: 'ITM-003',
        description: 'Filtro de Aceite',
        unitOfMeasure: 'UN',
        minimumStock: 10,
        stocks: [
          { warehouseId: 'wh-1', quantity: new Prisma.Decimal(15), averageCost: new Prisma.Decimal(18000), warehouse: { name: 'Bodega Central', location: 'Santiago' } },
        ],
        supplierCatalogs: [
          {
            id: 'sc-1',
            supplierId: 'sup-1',
            isExclusive: true,
            supplierPartNumber: 'FILT-MAQ-250',
            lastPrice: new Prisma.Decimal(19500),
            leadTimeDays: 2,
            notes: 'Exclusivo oficial',
            supplier: { businessName: 'Proveedor Maquinarias Spa', rut: '76.543.210-K' },
          },
        ],
      });

      mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
        unitPrice: new Prisma.Decimal(19000),
        purchaseOrder: {
          orderNumber: 'OC-202610-0001',
          createdAt: new Date('2026-10-01'),
          supplier: { businessName: 'Proveedor Maquinarias Spa', rut: '76.543.210-K' },
        },
      });

      mockPrisma.quotationLine.findMany.mockResolvedValue([
        {
          unitPrice: new Prisma.Decimal(19500),
          availabilityDays: 2,
          quotation: {
            quotationNumber: 'COT-202610-0001',
            createdAt: new Date('2026-10-05'),
            supplier: { businessName: 'Proveedor Maquinarias Spa' },
          },
        },
      ]);

      const insights = await service.getItemProcurementInsights('item-1');

      expect(insights.itemCode).toBe('ITM-003');
      expect(insights.totalStock).toBe(15);
      expect(insights.hasEnoughStock).toBe(true);
      expect(insights.hasExclusiveSupplier).toBe(true);
      expect(insights.exclusiveSupplier?.name).toBe('Proveedor Maquinarias Spa');
      expect(insights.lastPurchase?.unitPrice).toBe(19000);
      expect(insights.recommendation).toContain('Proveedor EXCLUSIVO');
    });

    it('should recommend quoting multiple suppliers if exactly 2 exist', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-2',
        code: 'ITM-005',
        description: 'Pernos 1/2',
        unitOfMeasure: 'UN',
        minimumStock: 100,
        stocks: [],
        supplierCatalogs: [
          { id: 'sc-1', supplierId: 'sup-1', isExclusive: false, lastPrice: new Prisma.Decimal(250), leadTimeDays: 1, supplier: { businessName: 'Ferretería 1', rut: '1-1' } },
          { id: 'sc-2', supplierId: 'sup-2', isExclusive: false, lastPrice: new Prisma.Decimal(260), leadTimeDays: 2, supplier: { businessName: 'Ferretería 2', rut: '2-2' } },
        ],
      });
      mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);
      mockPrisma.quotationLine.findMany.mockResolvedValue([]);

      const insights = await service.getItemProcurementInsights('item-2');

      expect(insights.supplierCount).toBe(2);
      expect(insights.hasExclusiveSupplier).toBe(false);
      expect(insights.recommendation).toContain('Historial registra 2 proveedores disponibles');
    });
  });

  describe('selectQuotation', () => {
    it('should select quote and discard sibling quotations from same request', async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        id: 'quote-1',
        purchaseRequestId: 'req-1',
        supplierId: 'sup-1',
        lines: [
          { itemId: 'item-1', unitPrice: new Prisma.Decimal(15000), availabilityDays: 3 },
        ],
        supplier: { id: 'sup-1', businessName: 'Proveedor Uno' },
      });

      mockPrisma.quotation.update.mockResolvedValue({
        id: 'quote-1',
        status: QuotationStatus.SELECCIONADA,
      });

      await service.selectQuotation('quote-1');

      expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-1' },
          data: { status: QuotationStatus.SELECCIONADA },
        }),
      );

      expect(mockPrisma.quotation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            purchaseRequestId: 'req-1',
            id: { not: 'quote-1' },
            status: { notIn: [QuotationStatus.DESCARTADA, QuotationStatus.VENCIDA] },
          },
          data: { status: QuotationStatus.DESCARTADA },
        }),
      );

      expect(mockPrisma.supplierCatalog.upsert).toHaveBeenCalled();
    });
  });
});
