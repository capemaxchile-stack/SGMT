import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssetType } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(assetType?: AssetType) {
    return this.prisma.maintenancePlan.findMany({
      where: {
        deletedAt: null,
        ...(assetType ? { assetType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { workOrders: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.maintenancePlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        workOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Pauta de mantenimiento con ID ${id} no encontrada`);
    }

    return plan;
  }

  async create(createPlanDto: CreatePlanDto) {
    return this.prisma.maintenancePlan.create({
      data: {
        ...createPlanDto,
        checklist: createPlanDto.checklist ? (createPlanDto.checklist as any) : undefined,
      },
    });
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.maintenancePlan.update({
      where: { id },
      data: {
        ...updatePlanDto,
        checklist: updatePlanDto.checklist ? (updatePlanDto.checklist as any) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.maintenancePlan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
