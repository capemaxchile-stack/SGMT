import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip: number = 0, take: number = 50) {
    const logs = await this.prisma.auditLog.findMany({
      skip,
      take,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // BigInt cannot be directly serialized by JSON.stringify
    // Prisma usually requires a workaround or we map it to string
    return logs.map(log => ({
      ...log,
      id: log.id.toString(),
    }));
  }
}
