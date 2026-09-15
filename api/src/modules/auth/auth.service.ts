import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
    
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, superKeyHash, ...result } = user;
      const roles = result.roles.map(r => r.role.name);
      return { ...result, roles };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id, roles: user.roles };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user,
    };
  }

  async refreshToken(token: string): Promise<AuthResponseDto> {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.validateUserBySub(decoded.sub);
      return this.login(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUserBySub(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, superKeyHash, ...result } = user;
    const roles = result.roles.map(r => r.role.name);
    return { ...result, roles };
  }

  async getProfile(userId: string) {
    return this.validateUserBySub(userId);
  }
}
