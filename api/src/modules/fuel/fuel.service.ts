import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { FilterFuelLogsDto } from './dto/filter-fuel-logs.dto';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class FuelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterFuelLogsDto) {
    const where: Prisma.FuelLogWhereInput = {};

    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.faenaId) where.faenaId = filters.faenaId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    if (filters.startDate || filters.endDate) {
      where.dispatchDate = {};
      if (filters.startDate) where.dispatchDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.dispatchDate.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { dispatchNumber: { contains: filters.search, mode: 'insensitive' } },
        { operatorName: { contains: filters.search, mode: 'insensitive' } },
        { fuelTruckPlate: { contains: filters.search, mode: 'insensitive' } },
        { dispatchTicketNumber: { contains: filters.search, mode: 'insensitive' } },
        { asset: { internalNumber: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.fuelLog.findMany({
      where,
      orderBy: { dispatchDate: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            internalNumber: true,
            brand: true,
            model: true,
            type: true,
            licensePlate: true,
          },
        },
        faena: {
          select: {
            id: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const log = await this.prisma.fuelLog.findUnique({
      where: { id },
      include: {
        asset: true,
        faena: true,
        warehouse: true,
        movement: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Registro de combustible con ID ${id} no encontrado`);
    }

    return log;
  }

  async create(dto: CreateFuelLogDto, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      include: {
        assignments: {
          where: { endDate: null },
          take: 1,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Equipo con ID ${dto.assetId} no encontrado`);
    }

    const faenaId = dto.faenaId || asset.assignments[0]?.faenaId || null;

    // Previous readings
    const prevHours = Number(asset.currentHourmeter || 0);
    const prevKm = Number(asset.currentKilometrage || 0);
    const currHours = dto.currentHourmeter ? Number(dto.currentHourmeter) : prevHours;
    const currKm = dto.currentKilometrage ? Number(dto.currentKilometrage) : prevKm;

    const hoursDelta = currHours > prevHours ? currHours - prevHours : 0;
    const kmDelta = currKm > prevKm ? currKm - prevKm : 0;

    // Calculate metrics
    let litersPerHour = 0;
    if (hoursDelta > 0) {
      litersPerHour = Number((dto.liters / hoursDelta).toFixed(2));
    }

    let kmPerLiter = 0;
    if (dto.liters > 0 && kmDelta > 0) {
      kmPerLiter = Number((kmDelta / dto.liters).toFixed(2));
    }

    // Consecutive dispatch number: DSP-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.prisma.fuelLog.count({
      where: {
        dispatchNumber: {
          startsWith: `DSP-${currentYear}-`,
        },
      },
    });
    const dispatchNumber = `DSP-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      let movementId: string | null = null;
      let unitPrice = dto.unitPrice || 0;

      // If warehouseId is provided, deduct fuel stock
      if (dto.warehouseId) {
        // Find diesel item
        const dieselItem = await tx.item.findFirst({
          where: {
            OR: [
              { category: 'COMBUSTIBLE' },
              { code: 'ITM-001' },
              { description: { contains: 'Diesel', mode: 'insensitive' } },
            ],
            deletedAt: null,
          },
        });

        if (dieselItem) {
          const stock = await tx.stock.findUnique({
            where: {
              itemId_warehouseId: {
                itemId: dieselItem.id,
                warehouseId: dto.warehouseId,
              },
            },
          });

          const currentStockQty = stock ? Number(stock.quantity) : 0;
          if (currentStockQty < dto.liters) {
            throw new BadRequestException(
              `Stock insuficiente de combustible en bodega. Disponible: ${currentStockQty} L, Solicitado: ${dto.liters} L`,
            );
          }

          unitPrice = unitPrice || (stock ? Number(stock.averageCost) : 0);

          // Deduct stock
          await tx.stock.update({
            where: {
              itemId_warehouseId: {
                itemId: dieselItem.id,
                warehouseId: dto.warehouseId,
              },
            },
            data: {
              quantity: { decrement: new Prisma.Decimal(dto.liters) },
            },
          });

          // Create SALIDA warehouse movement
          const movCount = await tx.warehouseMovement.count();
          const movementNumber = `MOV-${currentYear}-${String(movCount + 1).padStart(4, '0')}`;
          const mov = await tx.warehouseMovement.create({
            data: {
              type: MovementType.SALIDA,
              movementNumber,
              warehouseId: dto.warehouseId,
              faenaId,
              assetId: dto.assetId,
              userId,
              notes: `Despacho de combustible ${dispatchNumber} para equipo ${asset.internalNumber}`,
              lines: {
                create: [
                  {
                    itemId: dieselItem.id,
                    quantity: new Prisma.Decimal(dto.liters),
                    unitCost: new Prisma.Decimal(unitPrice),
                  },
                ],
              },
            },
          });
          movementId = mov.id;
        }
      }

      const totalCost = Number((dto.liters * unitPrice).toFixed(2));

      // Create FuelLog
      const fuelLog = await tx.fuelLog.create({
        data: {
          dispatchNumber,
          assetId: dto.assetId,
          faenaId,
          warehouseId: dto.warehouseId || null,
          movementId,
          liters: new Prisma.Decimal(dto.liters),
          unitPrice: new Prisma.Decimal(unitPrice),
          totalCost: new Prisma.Decimal(totalCost),
          previousHourmeter: new Prisma.Decimal(prevHours),
          currentHourmeter: new Prisma.Decimal(currHours),
          hourmeterDelta: new Prisma.Decimal(hoursDelta),
          litersPerHour: new Prisma.Decimal(litersPerHour),
          previousKilometrage: new Prisma.Decimal(prevKm),
          currentKilometrage: new Prisma.Decimal(currKm),
          kilometrageDelta: new Prisma.Decimal(kmDelta),
          kmPerLiter: new Prisma.Decimal(kmPerLiter),
          operatorName: dto.operatorName || null,
          fuelTruckPlate: dto.fuelTruckPlate || null,
          dispatchTicketNumber: dto.dispatchTicketNumber || null,
          notes: dto.notes || null,
          createdById: userId,
          dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : new Date(),
        },
        include: {
          asset: true,
          faena: true,
          warehouse: true,
        },
      });

      // Update asset meters if new values are higher
      const assetUpdate: Prisma.AssetUpdateInput = {};
      if (currHours > prevHours) {
        assetUpdate.currentHourmeter = new Prisma.Decimal(currHours);
      }
      if (currKm > prevKm) {
        assetUpdate.currentKilometrage = new Prisma.Decimal(currKm);
      }

      if (Object.keys(assetUpdate).length > 0) {
        await tx.asset.update({
          where: { id: dto.assetId },
          data: assetUpdate,
        });
      }

      return fuelLog;
    });
  }

  async getStats() {
    const logs = await this.prisma.fuelLog.findMany({
      include: {
        asset: true,
        faena: true,
      },
    });

    const totalLiters = logs.reduce((acc, l) => acc + Number(l.liters), 0);
    const totalSpend = logs.reduce((acc, l) => acc + Number(l.totalCost), 0);

    // Group by asset type
    const byAssetType: Record<string, { count: number; totalLiters: number; totalHoursDelta: number; avgLitersPerHour: number }> = {};
    for (const log of logs) {
      const type = log.asset.type;
      if (!byAssetType[type]) {
        byAssetType[type] = { count: 0, totalLiters: 0, totalHoursDelta: 0, avgLitersPerHour: 0 };
      }
      byAssetType[type].count += 1;
      byAssetType[type].totalLiters += Number(log.liters);
      byAssetType[type].totalHoursDelta += Number(log.hourmeterDelta);
    }

    for (const type of Object.keys(byAssetType)) {
      const data = byAssetType[type];
      data.avgLitersPerHour = data.totalHoursDelta > 0 ? Number((data.totalLiters / data.totalHoursDelta).toFixed(2)) : 0;
    }

    // Group by Faena
    const byFaena: Record<string, { name: string; totalLiters: number; totalSpend: number }> = {};
    for (const log of logs) {
      const faenaName = log.faena?.name || 'Central / No Asignada';
      if (!byFaena[faenaName]) {
        byFaena[faenaName] = { name: faenaName, totalLiters: 0, totalSpend: 0 };
      }
      byFaena[faenaName].totalLiters += Number(log.liters);
      byFaena[faenaName].totalSpend += Number(log.totalCost);
    }

    return {
      totalLiters,
      totalSpend,
      totalDispatches: logs.length,
      byAssetType,
      byFaena: Object.values(byFaena),
      recentLogs: logs.slice(0, 5),
    };
  }
}
