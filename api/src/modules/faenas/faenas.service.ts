import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFaenaDto } from './dto/create-faena.dto';
import { UpdateFaenaDto } from './dto/update-faena.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { FaenaStatus } from '@prisma/client';

@Injectable()
export class FaenasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFaenaDto: CreateFaenaDto) {
    return this.prisma.faena.create({
      data: createFaenaDto,
    });
  }

  async findAll(status?: FaenaStatus, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const faenas = await this.prisma.faena.findMany({
      where,
      include: {
        chief: true,
        _count: {
          select: {
            contracts: { where: { endDate: null } }, // Or some logic for active contracts
            assets: { where: { endDate: null } },
          },
        },
      },
    });

    return faenas.map(faena => ({
      ...faena,
      activeContractCount: faena._count.contracts,
      assetCount: faena._count.assets,
    }));
  }

  async findOne(id: string) {
    const faena = await this.prisma.faena.findUnique({
      where: { id },
      include: {
        chief: true,
        contracts: {
          include: { costCenters: true },
        },
        assets: {
          include: { asset: true },
        },
      },
    });

    if (!faena) {
      throw new NotFoundException(`Faena with ID ${id} not found`);
    }

    return faena;
  }

  async update(id: string, updateFaenaDto: UpdateFaenaDto) {
    return this.prisma.faena.update({
      where: { id },
      data: updateFaenaDto,
    });
  }

  async remove(id: string) {
    return this.prisma.faena.delete({
      where: { id },
    });
  }

  async addContract(faenaId: string, createContractDto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        ...createContractDto,
        faenaId,
      },
    });
  }

  async addCostCenter(contractId: string, createCostCenterDto: CreateCostCenterDto) {
    return this.prisma.costCenter.create({
      data: {
        ...createCostCenterDto,
        contractId,
      },
    });
  }
}
