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

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
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

    const { passwordHash, superKeyHash, ...result } = user;
    const roles = result.roles.map(r => r.role.name);
    return { ...result, roles };
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
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o deshabilitado');
    }
    const { passwordHash, superKeyHash, ...result } = user;
    const roles = result.roles.map(r => r.role.name);
    return { ...result, roles };
  }

  async getProfile(userId: string) {
    return this.validateUserBySub(userId);
  }
}
