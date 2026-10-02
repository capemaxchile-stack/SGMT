import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService Empirical Verification & Security Hardening', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prismaService: any;

  const JWT_SECRET = 'test_access_jwt_secret_key_12345';
  const JWT_REFRESH_SECRET = 'test_refresh_jwt_secret_key_67890_different';

  const mockActiveUser = {
    id: 'user-uuid-1',
    email: 'activo@sgmt.cl',
    name: 'Operador Activo',
    isActive: true,
    passwordHash: '',
    superKeyHash: '$2b$10$supersecretkeyhashmock',
    roles: [{ role: { name: 'BODEGUERO' } }],
  };

  const mockInactiveUser = {
    id: 'user-uuid-2',
    email: 'inactivo@sgmt.cl',
    name: 'Ex-Empleado Inactivo',
    isActive: false,
    passwordHash: '',
    superKeyHash: '$2b$10$supersecretkeyhashmock',
    roles: [{ role: { name: 'BODEGUERO' } }],
  };

  beforeAll(async () => {
    // Generate valid bcrypt hash for testing
    const hash = await bcrypt.hash('CorrectPassword123!', 10);
    mockActiveUser.passwordHash = hash;
    mockInactiveUser.passwordHash = hash;
  });

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              if (key === 'JWT_REFRESH_SECRET') return JWT_REFRESH_SECRET;
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateUser: Credentials & Inactive Status Hardening', () => {
    it('should reject non-existent user with UnauthorizedException', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('ghost@sgmt.cl', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject deactivated user (isActive: false) even with correct password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockInactiveUser);
      await expect(
        service.validateUser('inactivo@sgmt.cl', 'CorrectPassword123!'),
      ).rejects.toThrow('Usuario inactivo o deshabilitado');
    });

    it('should reject invalid password for active user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      await expect(
        service.validateUser('activo@sgmt.cl', 'WrongPassword!'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should authenticate active user and strip passwordHash and superKeyHash from returned payload', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      const result = await service.validateUser('activo@sgmt.cl', 'CorrectPassword123!');
      
      expect(result).toBeDefined();
      expect(result.id).toBe(mockActiveUser.id);
      expect(result.email).toBe(mockActiveUser.email);
      expect(result.roles).toEqual(['BODEGUERO']);
      // Sensitive hashes must be completely sanitized
      expect(result.passwordHash).toBeUndefined();
      expect(result.superKeyHash).toBeUndefined();
    });
  });

  describe('login & Token Secret Separation', () => {
    it('should reject login attempt if user.isActive === false', async () => {
      await expect(service.login({ ...mockInactiveUser, roles: ['BODEGUERO'] })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should sign accessToken with JWT_SECRET and refreshToken with JWT_REFRESH_SECRET', async () => {
      const authUser = { id: 'user-1', email: 'activo@sgmt.cl', isActive: true, roles: ['BODEGUERO'] };
      const tokens = await service.login(authUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toEqual(tokens.refreshToken);

      // Verify accessToken signature matches JWT_SECRET
      const accessDecoded: any = jwtService.verify(tokens.accessToken, { secret: JWT_SECRET });
      expect(accessDecoded.sub).toBe('user-1');
      expect(accessDecoded.roles).toEqual(['BODEGUERO']);

      // Verify refreshToken signature matches JWT_REFRESH_SECRET
      const refreshDecoded: any = jwtService.verify(tokens.refreshToken, { secret: JWT_REFRESH_SECRET });
      expect(refreshDecoded.sub).toBe('user-1');

      // CROSS-SECRET CHECK: accessToken cannot be decoded with refresh secret
      expect(() => {
        jwtService.verify(tokens.accessToken, { secret: JWT_REFRESH_SECRET });
      }).toThrow();

      // CROSS-SECRET CHECK: refreshToken cannot be decoded with access secret
      expect(() => {
        jwtService.verify(tokens.refreshToken, { secret: JWT_SECRET });
      }).toThrow();
    });
  });

  describe('refreshToken: Cross-Token Replay & Deactivated User Attacks', () => {
    it('should reject accessToken when supplied as a refreshToken (Cross-Token Replay Attack)', async () => {
      const authUser = { id: 'user-1', email: 'activo@sgmt.cl', isActive: true, roles: ['BODEGUERO'] };
      const tokens = await service.login(authUser);

      // Malicious attempt to use accessToken at refresh endpoint
      await expect(service.refreshToken(tokens.accessToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject forged refresh token signed with arbitrary key', async () => {
      const forgedToken = jwtService.sign({ sub: 'user-1' }, { secret: 'attacker_key_666' });
      await expect(service.refreshToken(forgedToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'user-1' },
        { secret: JWT_REFRESH_SECRET, expiresIn: '-1s' },
      );
      await expect(service.refreshToken(expiredToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject refresh token if user was deactivated after token generation', async () => {
      const authUser = { id: 'user-uuid-2', email: 'inactivo@sgmt.cl', isActive: true, roles: ['BODEGUERO'] };
      const tokens = await service.login(authUser);

      // User account gets deactivated in database
      prismaService.user.findUnique.mockResolvedValue(mockInactiveUser);

      await expect(service.refreshToken(tokens.refreshToken)).rejects.toThrow(
        'Usuario inactivo o deshabilitado',
      );
    });

    it('should succeed and issue fresh tokens when valid refreshToken is presented for active user', async () => {
      const authUser = { id: 'user-uuid-1', email: 'activo@sgmt.cl', isActive: true, roles: ['BODEGUERO'] };
      const tokens = await service.login(authUser);

      prismaService.user.findUnique.mockResolvedValue(mockActiveUser);

      const refreshed = await service.refreshToken(tokens.refreshToken);
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      expect(refreshed.user.id).toBe(mockActiveUser.id);
    });
  });

  describe('Missing JWT_REFRESH_SECRET Boot Environment Guard', () => {
    it('should throw explicit error if JWT_REFRESH_SECRET is undefined', async () => {
      const badModule = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret: 'any' }),
        ],
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === 'JWT_REFRESH_SECRET' ? undefined : 'val')),
            },
          },
        ],
      }).compile();

      const badService = badModule.get<AuthService>(AuthService);
      await expect(badService.login({ id: '1', isActive: true, roles: [] })).rejects.toThrow(
        'JWT_REFRESH_SECRET environment variable is missing.',
      );
    });
  });
});
