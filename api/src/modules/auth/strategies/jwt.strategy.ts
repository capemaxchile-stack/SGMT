import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing in JwtStrategy');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            planTier: true,
            status: true,
            enabledModules: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido o inactivo');
    }

    let effectiveTenant = user.tenant;
    if (payload.isImpersonating && payload.tenantId) {
      effectiveTenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          planTier: true,
          status: true,
          enabledModules: true,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      roles: payload.roles,
      isActive: user.isActive,
      tenantId: payload.tenantId || user.tenantId,
      tenant: effectiveTenant,
      isImpersonating: Boolean(payload.isImpersonating),
    };
  }
}
