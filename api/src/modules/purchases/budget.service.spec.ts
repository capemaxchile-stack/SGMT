import { NotFoundException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { OrderStatus, QuotationStatus, Prisma } from '@prisma/client';

describe('BudgetService', () => {
  let service: BudgetService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      faena: {
        findUnique: jest.fn(),
      },
      costCenter: {
        findUnique: jest.fn(),
      },
      budget: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      quotation: {
        findMany: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn(),
      },
    };

    service = new BudgetService(mockPrisma);
  });

  describe('upsertBudget', () => {
    it('throws NotFoundException if Faena does not exist', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertBudget({
          faenaId: 'faena-99',
          year: 2026,
          amount: 50000000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a new budget if none exists', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue({ id: 'f-1', name: 'Faena Centinela' });
      mockPrisma.budget.findFirst.mockResolvedValue(null);
      mockPrisma.budget.create.mockResolvedValue({
        id: 'b-1',
        faenaId: 'f-1',
        year: 2026,
        amount: new Prisma.Decimal(50000000),
      });

      const res = await service.upsertBudget({
        faenaId: 'f-1',
        year: 2026,
        amount: 50000000,
      });

      expect(mockPrisma.budget.create).toHaveBeenCalled();
      expect(res.id).toBe('b-1');
    });

    it('updates existing budget if already registered', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue({ id: 'f-1', name: 'Faena Centinela' });
      mockPrisma.budget.findFirst.mockResolvedValue({ id: 'b-old', amount: new Prisma.Decimal(40000000) });
      mockPrisma.budget.update.mockResolvedValue({ id: 'b-old', amount: new Prisma.Decimal(60000000) });

      const res = await service.upsertBudget({
        faenaId: 'f-1',
        year: 2026,
        amount: 60000000,
      });

      expect(mockPrisma.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-old' },
        }),
      );
      expect(res.amount).toEqual(new Prisma.Decimal(60000000));
    });
  });

  describe('getBudgetSummary', () => {
    it('calculates committed quotations and approved orders against budget', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue({
        id: 'f-1',
        name: 'Faena Centinela',
        location: 'Antofagasta',
        contracts: [
          {
            costCenters: [{ id: 'cc-1', code: 'CC-01', name: 'Movimiento Tierra' }],
          },
        ],
      });

      mockPrisma.budget.findMany.mockResolvedValue([
        { id: 'b-1', amount: new Prisma.Decimal(10000000), costCenterId: 'cc-1' },
      ]);

      mockPrisma.quotation.findMany.mockResolvedValue([
        {
          id: 'q-1',
          quotationNumber: 'COT-202610-0001',
          totalAmount: new Prisma.Decimal(1500000),
          status: QuotationStatus.SOLICITADA,
          supplier: { businessName: 'Komatsu Chile' },
          purchaseRequest: { requestNumber: 'SOL-01' },
          createdAt: new Date(),
        },
      ]);

      mockPrisma.purchaseOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          orderNumber: 'OC-202610-0001',
          totalAmount: new Prisma.Decimal(3000000),
          status: OrderStatus.APROBADA,
          supplier: { id: 's1', businessName: 'Finning CAT' },
          createdAt: new Date(),
          lines: [],
        },
        {
          id: 'po-2',
          orderNumber: 'OC-202610-0002',
          totalAmount: new Prisma.Decimal(2000000),
          status: OrderStatus.RECEPCION_TOTAL,
          supplier: { id: 's2', businessName: 'SKC Maquinarias' },
          createdAt: new Date(),
          lines: [],
        },
      ]);

      const summary = await service.getBudgetSummary('f-1', 2026);

      expect(summary.metrics.budgetTotal).toBe(10000000);
      expect(summary.metrics.committedQuotations).toBe(1500000);
      expect(summary.metrics.committedOrders).toBe(3000000);
      expect(summary.metrics.executedOrders).toBe(2000000);
      expect(summary.metrics.totalCommittedAndExecuted).toBe(6500000);
      expect(summary.metrics.availableBudget).toBe(3500000);
      expect(summary.metrics.percentageUsed).toBe(65);
      expect(summary.metrics.alertLevel).toBe('HEALTHY');
    });

    it('flags CRITICAL alert when over-budget', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue({
        id: 'f-1',
        name: 'Faena Centinela',
        location: 'Antofagasta',
        contracts: [],
      });

      mockPrisma.budget.findMany.mockResolvedValue([
        { id: 'b-1', amount: new Prisma.Decimal(5000000), costCenterId: null },
      ]);

      mockPrisma.quotation.findMany.mockResolvedValue([]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          orderNumber: 'OC-202610-0001',
          totalAmount: new Prisma.Decimal(6000000),
          status: OrderStatus.APROBADA,
          supplier: { id: 's1', businessName: 'Finning CAT' },
          createdAt: new Date(),
          lines: [],
        },
      ]);

      const summary = await service.getBudgetSummary('f-1', 2026);

      expect(summary.metrics.budgetTotal).toBe(5000000);
      expect(summary.metrics.availableBudget).toBe(-1000000);
      expect(summary.metrics.isOverBudget).toBe(true);
      expect(summary.metrics.alertLevel).toBe('CRITICAL');
    });
  });
});
