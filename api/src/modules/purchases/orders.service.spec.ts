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
});
