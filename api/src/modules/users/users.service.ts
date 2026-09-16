import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });
  }

  async findRoles() {
    return this.prisma.role.findMany();
  }
}
