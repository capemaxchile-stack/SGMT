import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementType, Prisma } from '@prisma/client';

describe('MovementsService', () => {
  let service: MovementsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      warehouseMovement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      warehouseMovementLine: {
        findMany: jest.fn(),
      },
      stock: {
        findMany: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };

    service = new MovementsService(mockPrisma);
  });

  describe('getKardex', () => {
    it('throws BadRequestException if warehouseId is missing', async () => {
      await expect(service.getKardex('item-1')).rejects.toThrow(BadRequestException);
      await expect(service.getKardex('item-1')).rejects.toThrow('WarehouseId is strictly required');
    });

    it('returns empty array if no movement lines exist', async () => {
      mockPrisma.warehouseMovementLine.findMany.mockResolvedValue([]);
      const result = await service.getKardex('item-1', 'wh-1');
      expect(result).toEqual([]);
    });

    it('calculates running balance accurately per warehouse', async () => {
      mockPrisma.warehouseMovementLine.findMany.mockResolvedValue([
        {
          id: 'l1',
          quantity: new Prisma.Decimal(10),
          unitCost: new Prisma.Decimal(100),
          movement: {
            type: MovementType.INGRESO,
            warehouseId: 'wh-1',
            createdAt: new Date('2026-10-01'),
          },
        },
        {
          id: 'l2',
          quantity: new Prisma.Decimal(3),
          unitCost: new Prisma.Decimal(100),
          movement: {
            type: MovementType.SALIDA,
            warehouseId: 'wh-1',
            createdAt: new Date('2026-10-02'),
          },
        },
      ]);

      const result = await service.getKardex('item-1', 'wh-1');
      expect(result.length).toBe(2);
      expect(result[0].balance).toBe(10);
      expect(result[1].balance).toBe(7);
    });
  });

  describe('create validations', () => {
    it('throws BadRequestException if movement has no lines', async () => {
      await expect(
        service.create({ type: MovementType.INGRESO, warehouseId: 'wh-1', lines: [] }, 'user-1'),
      ).rejects.toThrow('Movement requires at least one line');
    });

    it('throws BadRequestException if line quantity is zero or negative', async () => {
      await expect(
        service.create(
          {
            type: MovementType.INGRESO,
            warehouseId: 'wh-1',
            lines: [{ itemId: 'it-1', quantity: 0 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('Quantity must be strictly positive');
    });

    it('throws BadRequestException if TRANSFER has no targetWarehouseId', async () => {
      await expect(
        service.create(
          {
            type: MovementType.TRANSFER,
            warehouseId: 'wh-1',
            lines: [{ itemId: 'it-1', quantity: 5 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('targetWarehouseId is required and must differ from origin warehouseId');
    });

    it('throws BadRequestException if TRANSFER target matches origin', async () => {
      await expect(
        service.create(
          {
            type: MovementType.TRANSFER,
            warehouseId: 'wh-1',
            targetWarehouseId: 'wh-1',
            lines: [{ itemId: 'it-1', quantity: 5 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('targetWarehouseId is required and must differ from origin warehouseId');
    });
  });
});
