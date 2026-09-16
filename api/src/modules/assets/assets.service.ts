import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { AssetType, AssetOperationalStatus } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssetDto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: createAssetDto,
    });
  }

  async findAll(type?: AssetType, operationalStatus?: AssetOperationalStatus, faenaId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (operationalStatus) where.operationalStatus = operationalStatus;
    if (faenaId) {
      where.assignments = {
        some: {
          faenaId,
          endDate: null,
        }
      };
    }

    return this.prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: { endDate: null },
          include: { faena: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { faena: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    return this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
    });
  }

  async updateMeter(id: string, updateMeterDto: UpdateMeterDto) {
    return this.prisma.asset.update({
      where: { id },
      data: updateMeterDto,
    });
  }

  async assign(id: string, assignAssetDto: AssignAssetDto) {
    // Close any prior open assignment
    await this.prisma.assetAssignment.updateMany({
      where: { assetId: id, endDate: null },
      data: { endDate: new Date() },
    });

    return this.prisma.assetAssignment.create({
      data: {
        assetId: id,
        faenaId: assignAssetDto.faenaId,
        startDate: assignAssetDto.startDate,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
