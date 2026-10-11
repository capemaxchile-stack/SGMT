import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus, AuthorizationAction, Prisma } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      purchaseOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      purchaseRequest: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      authorization: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };

    service = new OrdersService(mockPrisma);
  });

  describe('create validations', () => {
    it('throws BadRequestException if order has no lines', async () => {
      await expect(
        service.create({ supplierId: 's1', lines: [] }),
      ).rejects.toThrow('Purchase Order requires at least one line');
    });

    it('throws BadRequestException if line has negative price', async () => {
      await expect(
        service.create({ supplierId: 's1', lines: [{ itemId: 'i1', quantity: 1, unitPrice: -100 }] }),
      ).rejects.toThrow('Line quantity must be > 0 and price >= 0');
    });

    it('throws BadRequestException if linked field request is not APROBADA', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'BORRADOR',
      });

      await expect(
        service.create({
          supplierId: 's1',
          purchaseRequestId: 'req-1',
          lines: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }],
        }),
      ).rejects.toThrow('Only APROBADA field requests can be converted to purchase order');
    });
  });

  describe('updateStatus FSM and limit validations', () => {
    it('throws BadRequestException if moving from terminal state RECHAZADA', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: OrderStatus.RECHAZADA,
      });

      await expect(
        service.updateStatus('po-1', { action: AuthorizationAction.APROBADA }, 'user-1'),
      ).rejects.toThrow('Cannot move Purchase Order from RECHAZADA');
    });

    it('throws BadRequestException if moving from terminal state RECEPCION_TOTAL', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: OrderStatus.RECEPCION_TOTAL,
      });

      await expect(
        service.updateStatus('po-1', { action: AuthorizationAction.APROBADA }, 'user-1'),
      ).rejects.toThrow('Cannot move Purchase Order from RECEPCION_TOTAL');
    });

    it('throws BadRequestException if moving from BORRADOR to RECEPCION_TOTAL directly', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: OrderStatus.BORRADOR,
      });

      await expect(
        service.updateStatus('po-1', { status: OrderStatus.RECEPCION_TOTAL }, 'user-1'),
      ).rejects.toThrow('Cannot move Purchase Order from BORRADOR to RECEPCION_TOTAL');
    });

    it('throws ApprovalLimitExceeded when approver role limit is less than order total', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: OrderStatus.PENDIENTE_APROBACION,
        totalAmount: new Prisma.Decimal(10000000),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        roles: [
          {
            role: {
              name: 'JEFE_FAENA',
              maxApprovalAmount: new Prisma.Decimal(1000000),
            },
          },
        ],
      });

      await expect(
        service.updateStatus('po-1', { action: AuthorizationAction.APROBADA }, 'user-1'),
      ).rejects.toThrow('ApprovalLimitExceeded');
    });

    it('throws UnauthorizedException when superKey is missing for exception approval', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: OrderStatus.PENDIENTE_APROBACION,
        totalAmount: new Prisma.Decimal(10000000),
      });

      await expect(
        service.updateStatus('po-1', { action: AuthorizationAction.EXCEPCION }, 'user-1'),
      ).rejects.toThrow('Invalid or missing superKey');
    });
  });

  describe('receiveOrder logistics destinations', () => {
    it('handles GARITA_TRANSITO reception correctly without closing the order', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'po-1', status: OrderStatus.EMITIDA }]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-202610-0001',
        status: OrderStatus.EMITIDA,
        lines: [{ itemId: 'i-1', quantity: new Prisma.Decimal(5), unitPrice: new Prisma.Decimal(1000) }],
      });
      mockPrisma.warehouseMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'mov-1',
          movementNumber: 'MOV-202610-0001',
          destination: 'GARITA_TRANSITO',
        }),
      };
      mockPrisma.warehouse = {
        findFirst: jest.fn().mockResolvedValue({ id: 'wh-1' }),
      };

      const result = await service.receiveOrder(
        'po-1',
        { destination: 'GARITA_TRANSITO' as any, gateTicketNumber: 'GT-9999' },
        'user-1',
      );

      expect(mockPrisma.warehouseMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            destination: 'GARITA_TRANSITO',
            gateTicketNumber: 'GT-9999',
          }),
        }),
      );

      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({
            status: OrderStatus.RECEPCION_PARCIAL,
            gateTicketNumber: 'GT-9999',
          }),
        }),
      );
    });

    it('handles ACTIVO_DIRECTO terrain reception directly linking to asset', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'po-2', status: OrderStatus.EMITIDA }]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-2',
        orderNumber: 'OC-202610-0002',
        status: OrderStatus.EMITIDA,
        lines: [{ itemId: 'i-1', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(5000) }],
      });
      mockPrisma.warehouseMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'mov-2',
          movementNumber: 'MOV-202610-0002',
          destination: 'ACTIVO_DIRECTO',
        }),
      };
      mockPrisma.warehouse = {
        findFirst: jest.fn().mockResolvedValue({ id: 'wh-1' }),
      };

      await service.receiveOrder(
        'po-2',
        { destination: 'ACTIVO_DIRECTO' as any, targetAssetId: 'asset-99' },
        'user-1',
      );

      expect(mockPrisma.warehouseMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            destination: 'ACTIVO_DIRECTO',
            assetId: 'asset-99',
          }),
        }),
      );

      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-2' },
          data: expect.objectContaining({
            status: OrderStatus.RECEPCION_TOTAL,
            targetAssetId: 'asset-99',
          }),
        }),
      );
    });
  });
});
