import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto, SetSuperKeyDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllActive() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un usuario con el correo ${dto.email}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let superKeyHash: string | null = null;
    if (dto.superKey) {
      superKeyHash = await bcrypt.hash(dto.superKey, 12);
    }

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        passwordHash,
        superKeyHash,
        isActive: true,
        roles: {
          create: dto.roleIds.map((roleId) => ({ roleId })),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: { role: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const emailLower = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findFirst({
        where: { email: emailLower, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`El correo ${dto.email} ya está registrado`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
          ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: { role: true },
          },
        },
      });
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  async setSuperKey(id: string, dto: SetSuperKeyDto) {
    await this.findOne(id);
    const superKeyHash = await bcrypt.hash(dto.superKey, 12);
    await this.prisma.user.update({
      where: { id },
      data: { superKeyHash },
    });
    return { success: true, message: 'Clave de Súper Usuario actualizada correctamente' };
  }

  async findRoles() {
    return this.prisma.role.findMany({
      orderBy: { level: 'asc' },
    });
  }
}
