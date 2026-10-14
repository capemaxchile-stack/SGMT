import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get refreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is missing.');
    }
    return secret;
  }

  private formatUserWithPermissions(user: any) {
    const { passwordHash, superKeyHash, ...result } = user;
    const roles = (result.roles || []).map((r: any) => r.role?.name || r.name);
    const isSuperOrAdmin = roles.includes('ADMIN_SISTEMA') || roles.includes('SUPER_USUARIO');

    const modulesList = [
      'DASHBOARD',
      'FAENAS',
      'FLOTA',
      'CERTIFICACIONES',
      'MANTENIMIENTO',
      'COMBUSTIBLE',
      'BODEGA',
      'COMPRAS',
      'TERRENO',
      'COPILOT',
      'REPORTES',
      'DOCUMENTACION',
      'ADMINISTRACION',
    ];

    const permissions: Record<
      string,
      { canRead: boolean; canWrite: boolean; canApprove: boolean; canAdmin: boolean }
    > = {};

    for (const mod of modulesList) {
      permissions[mod] = {
        canRead: isSuperOrAdmin,
        canWrite: isSuperOrAdmin,
        canApprove: isSuperOrAdmin,
        canAdmin: isSuperOrAdmin,
      };
    }

    if (!isSuperOrAdmin && Array.isArray(result.roles)) {
      for (const ur of result.roles) {
        if (ur.role?.permissions) {
          for (const p of ur.role.permissions) {
            if (!permissions[p.module]) {
              permissions[p.module] = {
                canRead: false,
                canWrite: false,
                canApprove: false,
                canAdmin: false,
              };
            }
            permissions[p.module].canRead = permissions[p.module].canRead || p.canRead;
            permissions[p.module].canWrite = permissions[p.module].canWrite || p.canWrite;
            permissions[p.module].canApprove = permissions[p.module].canApprove || p.canApprove;
            permissions[p.module].canAdmin = permissions[p.module].canAdmin || p.canAdmin;
          }
        }
      }
    }

    return { ...result, roles, permissions };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o deshabilitado');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.formatUserWithPermissions(user);
  }

  async login(user: any): Promise<AuthResponseDto> {
    if (user.isActive === false) {
      throw new UnauthorizedException('Usuario inactivo o deshabilitado');
    }

    const payload = { email: user.email, sub: user.id, roles: user.roles };
    const refreshSecret = this.refreshSecret;
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
      user,
    };
  }

  async refreshToken(token: string): Promise<AuthResponseDto> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.refreshSecret,
      });
      const user = await this.validateUserBySub(decoded.sub);
      if (!user.isActive) {
        throw new UnauthorizedException('Usuario inactivo o deshabilitado');
      }
      return this.login(user);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUserBySub(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o deshabilitado');
    }
    return this.formatUserWithPermissions(user);
  }

  async getProfile(userId: string) {
    return this.validateUserBySub(userId);
  }

  async updateProfile(userId: string, name?: string) {
    if (name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }
    return this.validateUserBySub(userId);
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }
    const passwordHash = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }
}
