import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderStatus, WorkOrderType, WorkOrderPriority, Prisma } from '@prisma/client';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      asset: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      stock: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      warehouseMovement: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      workOrderItem: {
        create: jest.fn(),
      },
      maintenancePlan: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    service = new WorkOrdersService(mockPrisma);
  });

  describe('create', () => {
    it('throws NotFoundException if asset does not exist', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            assetId: 'invalid-id',
            type: WorkOrderType.PREVENTIVO,
            description: 'Test service',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates work order successfully and auto-generates OT number', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        currentHourmeter: new Prisma.Decimal(120),
        currentKilometrage: new Prisma.Decimal(5000),
        assignments: [{ faenaId: 'faena-1' }],
      });

      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'ot-1',
        otNumber: 'OT-2026-0001',
        description: 'Test OT',
        status: WorkOrderStatus.ABIERTA,
      });

      const result = await service.create(
        {
          assetId: 'asset-1',
          type: WorkOrderType.PREVENTIVO,
          priority: WorkOrderPriority.MEDIA,
          description: 'Test OT',
        },
        'user-1',
      );

      expect(result.otNumber).toBe('OT-2026-0001');
      expect(mockPrisma.workOrder.create).toHaveBeenCalled();
    });
  });

  describe('consumeItem', () => {
    it('throws BadRequestException if stock is insufficient', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        otNumber: 'OT-2026-0001',
        status: WorkOrderStatus.ABIERTA,
        totalCost: new Prisma.Decimal(0),
        assetId: 'asset-1',
        faenaId: 'faena-1',
      });

      mockPrisma.stock.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal(2),
        averageCost: new Prisma.Decimal(5000),
        item: { description: 'Filtro Aceite' },
      });

      await expect(
        service.consumeItem(
          'ot-1',
          {
            itemId: 'item-1',
            warehouseId: 'wh-1',
            quantity: 5,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deducts stock and creates automatic warehouse movement on valid consumption', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        otNumber: 'OT-2026-0001',
        status: WorkOrderStatus.ABIERTA,
        totalCost: new Prisma.Decimal(0),
        assetId: 'asset-1',
        faenaId: 'faena-1',
      });

      mockPrisma.stock.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(5000),
        item: { description: 'Filtro Aceite' },
      });

      mockPrisma.warehouseMovement.create.mockResolvedValue({ id: 'mov-1' });
      mockPrisma.workOrderItem.create.mockResolvedValue({
        id: 'item-consumed-1',
        totalCost: new Prisma.Decimal(10000),
      });

      const result = await service.consumeItem(
        'ot-1',
        {
          itemId: 'item-1',
          warehouseId: 'wh-1',
          quantity: 2,
        },
        'user-1',
      );

      expect(mockPrisma.stock.update).toHaveBeenCalled();
      expect(mockPrisma.warehouseMovement.create).toHaveBeenCalled();
      expect(result.id).toBe('item-consumed-1');
    });
  });
});
