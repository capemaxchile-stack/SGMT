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
        tenant: true,
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

    const isSuperUser = user.roles?.some((ur: any) => ur.role?.name === 'SUPER_USUARIO');
    if (!isSuperUser && user.tenant) {
      if (user.tenant.status === 'SUSPENDIDO') {
        throw new UnauthorizedException(
          'Tu cuenta de empresa se encuentra suspendida temporalmente por regularización comercial. Por favor contacta a administración.',
        );
      }
      if (user.tenant.status === 'CANCELADO') {
        throw new UnauthorizedException(
          'La cuenta de empresa ha sido cancelada o terminada. Contacta al soporte de KATEI.',
        );
      }
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

    const payload = {
      email: user.email,
      sub: user.id,
      roles: user.roles,
      tenantId: user.tenantId,
    };
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

  async createImpersonationToken(superUser: any, targetTenant: any): Promise<AuthResponseDto> {
    const payload = {
      email: superUser.email,
      sub: superUser.id,
      roles: superUser.roles,
      tenantId: targetTenant.id,
      isImpersonating: true,
      originalTenantId: superUser.tenantId || null,
    };
    const refreshSecret = this.refreshSecret;
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
      user: {
        ...superUser,
        tenantId: targetTenant.id,
        tenant: targetTenant,
        isImpersonating: true,
      },
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
        tenant: true,
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

  /**
   * Genera un token firmado temporal y despacha correo vía Brevo central KATEI
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: true },
    });

    // Retornamos éxito genérico para evitar enumeración de usuarios
    if (!user || !user.isActive) {
      return {
        success: true,
        message: 'Si el correo existe en el sistema, recibirás las instrucciones de recuperación.',
      };
    }

    const resetPayload = {
      sub: user.id,
      email: user.email,
      purpose: 'password_reset',
    };

    const resetToken = this.jwtService.sign(resetPayload, {
      expiresIn: '1h',
    });

    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'soporte@katei.cl';
    const senderName = 'KATEI Plataforma';

    if (brevoApiKey) {
      const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">KATEI</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Recuperación de Contraseña</p>
          </div>
          <div style="padding: 32px 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0; font-size: 15px;">Hola <strong>${user.name}</strong>,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en KATEI.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
                Restablecer mi Contraseña
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Este enlace expirará en <strong>60 minutos</strong> por razones de seguridad. Si no solicitaste este cambio, podés ignorar este correo.
            </p>
          </div>
        </div>
      `;

      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: user.email, name: user.name }],
          subject: 'KATEI — Instrucciones para restablecer tu contraseña',
          htmlContent,
        }),
      }).catch(() => {});
    }

    return {
      success: true,
      message: 'Si el correo existe en el sistema, recibirás las instrucciones de recuperación.',
    };
  }

  /**
   * Restablece la contraseña validando el token temporal
   */
  async resetPasswordWithToken(token: string, newPass: string): Promise<{ success: boolean; message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('El enlace de recuperación es inválido o ha expirado.');
    }

    if (payload.purpose !== 'password_reset' || !payload.sub) {
      throw new UnauthorizedException('Token inválido para restablecimiento de contraseña.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido o deshabilitado.');
    }

    const passwordHash = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { success: true, message: 'Tu contraseña ha sido actualizada con éxito.' };
  }
}
