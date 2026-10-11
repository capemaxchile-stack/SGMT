import { BadRequestException } from '@nestjs/common';
import { PurchaseSuggestionsService } from './purchase-suggestions.service';
import { RequestUrgency, Prisma } from '@prisma/client';

describe('PurchaseSuggestionsService', () => {
  let service: PurchaseSuggestionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      item: {
        findMany: jest.fn(),
      },
      warehouseMovementLine: {
        findMany: jest.fn(),
      },
      faena: {
        findUnique: jest.fn(),
      },
      purchaseRequest: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new PurchaseSuggestionsService(mockPrisma);
  });

  describe('getSuggestions', () => {
    it('flags items below minimum stock and high turnover items with low runway', async () => {
      mockPrisma.item.findMany.mockResolvedValue([
        {
          id: 'i-1',
          code: 'FIL-001',
          description: 'Filtro Aceite CAT',
          category: 'FILTROS',
          unitOfMeasure: 'UN',
          minimumStock: 10,
          stocks: [{ quantity: new Prisma.Decimal(2), warehouseId: 'w-1' }],
          supplierCatalogs: [
            {
              supplier: { id: 's-1', businessName: 'Finning CAT', rut: '76111222-3' },
              isExclusive: true,
              lastPrice: new Prisma.Decimal(45000),
              leadTimeDays: 2,
            },
          ],
        },
        {
          id: 'i-2',
          code: 'ACE-001',
          description: 'Aceite Motor 15W40',
          category: 'LUBRICANTES',
          unitOfMeasure: 'LT',
          minimumStock: 20,
          stocks: [{ quantity: new Prisma.Decimal(50), warehouseId: 'w-1' }],
          supplierCatalogs: [],
        },
      ]);

      mockPrisma.warehouseMovementLine.findMany.mockResolvedValue([
        // i-2 has 300 liters consumed in 60 days -> 5 L/day -> 50 / 5 = 10 days of runway -> LOW RUNWAY!
        { itemId: 'i-2', quantity: new Prisma.Decimal(300) },
      ]);

      const res = await service.getSuggestions();

      expect(res.suggestions.length).toBe(2);

      // Item 1: Stock below minimum
      const sug1 = res.suggestions.find((s) => s.itemId === 'i-1');
      expect(sug1).toBeDefined();
      expect(sug1?.currentStock).toBe(2);
      expect(sug1?.minimumStock).toBe(10);
      expect(sug1?.urgency).toBe(RequestUrgency.ALTA);
      expect(sug1?.recommendedSupplier?.businessName).toBe('Finning CAT');
      expect(sug1?.recommendedSupplier?.isExclusive).toBe(true);

      // Item 2: High turnover / low runway (<15 days)
      const sug2 = res.suggestions.find((s) => s.itemId === 'i-2');
      expect(sug2).toBeDefined();
      expect(sug2?.runwayDays).toBe(10);
      expect(sug2?.dailyBurnRate).toBe(5);
    });
  });

  describe('generateRequestFromSuggestion', () => {
    it('throws BadRequestException if no items provided', async () => {
      await expect(
        service.generateRequestFromSuggestion('u-1', {
          faenaId: 'f-1',
          justification: 'Replenishment',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates PurchaseRequest with generated requestNumber', async () => {
      mockPrisma.faena.findUnique.mockResolvedValue({ id: 'f-1', name: 'Faena Centinela' });
      mockPrisma.purchaseRequest.findFirst.mockResolvedValue(null);
      mockPrisma.purchaseRequest.create.mockResolvedValue({
        id: 'req-1',
        requestNumber: 'SOL-202610-0001',
        lines: [],
      });

      const res = await service.generateRequestFromSuggestion('u-1', {
        faenaId: 'f-1',
        justification: 'Reposición predictiva automática',
        items: [{ itemId: 'i-1', quantity: 15, urgency: RequestUrgency.ALTA }],
      });

      expect(mockPrisma.purchaseRequest.create).toHaveBeenCalled();
      expect(res.id).toBe('req-1');
    });
  });
});
