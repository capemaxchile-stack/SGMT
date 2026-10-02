import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService SEC-001 Credential Sanitization Verification', () => {
  let service: UsersService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('findAllActive must strictly query with select projection excluding passwordHash and superKeyHash', async () => {
    prismaService.user.findMany.mockImplementation(async (args: any) => {
      // Assert that select is used instead of include or unprojected query
      expect(args.where).toEqual({ isActive: true });
      expect(args.select).toBeDefined();
      expect(args.select.passwordHash).toBeUndefined();
      expect(args.select.superKeyHash).toBeUndefined();
      expect(args.select.id).toBe(true);
      expect(args.select.email).toBe(true);
      expect(args.select.name).toBe(true);
      expect(args.select.isActive).toBe(true);
      expect(args.select.roles).toBeDefined();

      return [
        {
          id: '1',
          email: 'admin@sgmt.cl',
          name: 'Admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          roles: [{ role: { name: 'ADMIN_SISTEMA' } }],
        },
      ];
    });

    const result = await service.findAllActive();
    expect(result).toHaveLength(1);
    expect((result[0] as any).passwordHash).toBeUndefined();
    expect((result[0] as any).superKeyHash).toBeUndefined();
  });
});
