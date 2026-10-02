import { ValidationPipe, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { RefreshTokenDto } from '../../modules/auth/auth.controller';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { UpdateOrderStatusDto } from '../../modules/purchases/dto/update-order-status.dto';
import { AuthorizationAction } from '@prisma/client';

describe('ValidationPipe Empirical Tests (SEC-013)', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    // Exact configuration applied in main.ts
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('RefreshTokenDto unknown property rejection', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: RefreshTokenDto,
    };

    it('1. Accepts valid RefreshTokenDto', async () => {
      const validPayload = { refreshToken: 'valid.jwt.token' };
      const result = await pipe.transform(validPayload, metadata);
      expect(result).toBeInstanceOf(RefreshTokenDto);
      expect(result.refreshToken).toBe('valid.jwt.token');
    });

    it('2. Rejects unexpected / unknown properties with BadRequestException', async () => {
      const payloadWithExtra = {
        refreshToken: 'valid.jwt.token',
        injectedAdmin: true,
        extraSecret: 'attack',
      };

      await expect(pipe.transform(payloadWithExtra, metadata)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await pipe.transform(payloadWithExtra, metadata);
      } catch (err: any) {
        expect(err.getStatus()).toBe(400);
        const response = err.getResponse();
        expect(response.message).toEqual(
          expect.arrayContaining([
            'property injectedAdmin should not exist',
            'property extraSecret should not exist',
          ]),
        );
      }
    });

    it('3. Rejects missing refreshToken', async () => {
      const emptyPayload = {};
      await expect(pipe.transform(emptyPayload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('LoginDto unknown property rejection', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: LoginDto,
    };

    it('1. Accepts valid LoginDto', async () => {
      const validPayload = {
        email: 'admin@samtech.cl',
        password: 'SecurePassword123!',
      };
      const result = await pipe.transform(validPayload, metadata);
      expect(result).toBeInstanceOf(LoginDto);
      expect(result.email).toBe('admin@samtech.cl');
      expect(result.password).toBe('SecurePassword123!');
    });

    it('2. Rejects privilege escalation attempt via unknown fields', async () => {
      const escalatedPayload = {
        email: 'admin@samtech.cl',
        password: 'SecurePassword123!',
        roles: ['SUPER_USUARIO'],
        isActive: true,
        superKey: 'bypass',
      };

      await expect(pipe.transform(escalatedPayload, metadata)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await pipe.transform(escalatedPayload, metadata);
      } catch (err: any) {
        expect(err.getStatus()).toBe(400);
        const response = err.getResponse();
        expect(response.message).toEqual(
          expect.arrayContaining([
            'property roles should not exist',
            'property isActive should not exist',
            'property superKey should not exist',
          ]),
        );
      }
    });
  });

  describe('UpdateOrderStatusDto strict property validation', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateOrderStatusDto,
    };

    it('1. Accepts valid UpdateOrderStatusDto with whitelisted fields', async () => {
      const validPayload = {
        action: AuthorizationAction.APROBADA,
        comments: 'Approved by management',
        level: 1,
        superKey: 'valid_super_key',
      };
      const result = await pipe.transform(validPayload, metadata);
      expect(result.action).toBe(AuthorizationAction.APROBADA);
      expect(result.superKey).toBe('valid_super_key');
    });

    it('2. Rejects unauthorized status modification properties', async () => {
      const invalidPayload = {
        action: AuthorizationAction.APROBADA,
        status: 'FORCE_APPROVED',
        approvedAmount: 999999999,
      };

      await expect(pipe.transform(invalidPayload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
