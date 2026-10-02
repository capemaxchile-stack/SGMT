import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';

describe('JwtStrategy Empirical Verification', () => {
  let strategy: JwtStrategy;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test_jwt_secret_value_12345';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should reject when user does not exist in database', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'missing-user-id', roles: [] })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when user exists but isActive is false', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'inactive-user',
      email: 'inactive@sgmt.cl',
      isActive: false,
    });
    await expect(strategy.validate({ sub: 'inactive-user', roles: [] })).rejects.toThrow(
      'Usuario no válido o inactivo',
    );
  });

  it('should accept when user is active', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'active-user',
      email: 'active@sgmt.cl',
      isActive: true,
    });
    const result = await strategy.validate({ sub: 'active-user', roles: ['BODEGUERO'] });
    expect(result).toEqual({
      id: 'active-user',
      email: 'active@sgmt.cl',
      roles: ['BODEGUERO'],
      isActive: true,
    });
  });

  it('should throw error on instantiation if JWT_SECRET is missing', () => {
    const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
    expect(() => new JwtStrategy(emptyConfig, prismaService)).toThrow(
      'JWT_SECRET environment variable is missing in JwtStrategy',
    );
  });
});
