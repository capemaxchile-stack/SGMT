import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    skip: number = 0,
    take: number = 50,
    filters?: { entity?: string; action?: string; tenantId?: string },
  ) {
    const where: any = {};
    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.tenantId) {
      where.OR = [
        { user: { tenantId: filters.tenantId } },
        { entity: 'tenants', entityId: filters.tenantId },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // BigInt cannot be directly serialized by JSON.stringify
    // Prisma usually requires a workaround or we map it to string
    return logs.map((log) => ({
      ...log,
      id: log.id.toString(),
      createdAt: log.timestamp,
    }));
  }
}
