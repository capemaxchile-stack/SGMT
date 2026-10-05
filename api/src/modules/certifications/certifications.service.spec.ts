import { Test, TestingModule } from '@nestjs/testing';
import { CertificationsService, computeExpirationStatus } from './certifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CertificationsService', () => {
  let service: CertificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    asset: {
      findUnique: jest.fn(),
    },
    assetDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    faena: {
      findUnique: jest.fn(),
    },
    operatorCertification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CertificationsService>(CertificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('computeExpirationStatus', () => {
    it('should correctly mark past dates as VENCIDO', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const res = computeExpirationStatus(pastDate);
      expect(res.status).toBe('VENCIDO');
      expect(res.daysRemaining).toBeLessThan(0);
    });

    it('should correctly mark dates in 3 days as CRITICO_5', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);
      const res = computeExpirationStatus(nearDate);
      expect(res.status).toBe('CRITICO_5');
    });

    it('should correctly mark dates in 12 days as POR_VENCER_15', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 12);
      const res = computeExpirationStatus(nearDate);
      expect(res.status).toBe('POR_VENCER_15');
    });

    it('should correctly mark dates in 25 days as POR_VENCER_30', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 25);
      const res = computeExpirationStatus(futureDate);
      expect(res.status).toBe('POR_VENCER_30');
    });

    it('should mark dates beyond 30 days as VIGENTE', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const res = computeExpirationStatus(futureDate);
      expect(res.status).toBe('VIGENTE');
      expect(res.daysRemaining).toBeGreaterThan(30);
    });
  });

  describe('createAssetDocument', () => {
    it('should create asset document if asset exists', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue({ id: 'asset-1', internalNumber: 'EX-01' });
      const futureDate = new Date(Date.now() + 86400000 * 40);
      mockPrismaService.assetDocument.create.mockResolvedValue({
        id: 'doc-1',
        assetId: 'asset-1',
        docType: 'REVISION_TECNICA',
        expirationDate: futureDate,
      });

      const res = await service.createAssetDocument(
        {
          assetId: 'asset-1',
          docType: 'REVISION_TECNICA',
          expirationDate: futureDate.toISOString(),
        },
        'user-1',
      );

      expect(res.id).toBe('doc-1');
      expect(res.status).toBe('VIGENTE');
    });
  });
});
