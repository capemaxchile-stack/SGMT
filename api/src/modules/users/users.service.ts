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
      include: {
        permissions: {
          orderBy: { module: 'asc' },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  async createRole(dto: {
    name: string;
    displayName: string;
    level: number;
    maxApprovalAmount?: number;
  }) {
    const normalizedName = dto.name.toUpperCase().trim().replace(/\s+/g, '_');
    const existing = await this.prisma.role.findUnique({
      where: { name: normalizedName },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un rol con el identificador ${normalizedName}`);
    }

    const modulesList = [
      'DASHBOARD',
      'FAENAS',
      'FLOTA',
      'CERTIFICACIONES',
      'MANTENIMIENTO',
      'COMBUSTIBLE',
      'BODEGA',
      'COMPRAS',
      'REPORTES',
      'ADMINISTRACION',
    ];

    return this.prisma.role.create({
      data: {
        name: normalizedName,
        displayName: dto.displayName.trim(),
        level: dto.level,
        maxApprovalAmount: dto.maxApprovalAmount,
        permissions: {
          create: modulesList.map((mod) => ({
            module: mod,
            canRead: false,
            canWrite: false,
            canApprove: false,
            canAdmin: false,
          })),
        },
      },
      include: {
        permissions: {
          orderBy: { module: 'asc' },
        },
      },
    });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          orderBy: { module: 'asc' },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }
    return role.permissions;
  }

  async updateRolePermissions(
    roleId: string,
    permissions: Array<{
      module: string;
      canRead: boolean;
      canWrite: boolean;
      canApprove: boolean;
      canAdmin: boolean;
    }>,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const p of permissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_module: {
              roleId,
              module: p.module,
            },
          },
          update: {
            canRead: p.canRead,
            canWrite: p.canWrite,
            canApprove: p.canApprove,
            canAdmin: p.canAdmin,
          },
          create: {
            roleId,
            module: p.module,
            canRead: p.canRead,
            canWrite: p.canWrite,
            canApprove: p.canApprove,
            canAdmin: p.canAdmin,
          },
        });
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            orderBy: { module: 'asc' },
          },
        },
      });
    });
  }
}
