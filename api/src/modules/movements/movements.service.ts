import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterMovementsDto) {
    const where: Prisma.WarehouseMovementWhereInput = {};
    if (filters.type) where.type = filters.type;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.faenaId) where.faenaId = filters.faenaId;
    if (filters.assetId) where.assetId = filters.assetId;

    return this.prisma.warehouseMovement.findMany({
      where,
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
        warehouse: true,
        faena: true,
        asset: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.warehouseMovement.findUnique({
      where: { id },
      include: {
        lines: { include: { item: true } },
        user: { select: { id: true, name: true, email: true } },
        warehouse: true,
        faena: true,
        asset: true,
        purchaseOrder: true,
      },
    });

    if (!movement) {
      throw new NotFoundException(`Movement with id ${id} not found`);
    }
    return movement;
  }

  async create(createMovementDto: CreateMovementDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Auto-generate movement number
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', ''); // e.g. 202609
      const count = await tx.warehouseMovement.count({
        where: { movementNumber: { startsWith: `MOV-${dateStr}` } },
      });
      const nextNum = (count + 1).toString().padStart(4, '0');
      const movementNumber = `MOV-${dateStr}-${nextNum}`;

      // 2. Create Movement + Lines
      const movement = await tx.warehouseMovement.create({
        data: {
          type: createMovementDto.type,
          movementNumber,
          warehouseId: createMovementDto.warehouseId,
          faenaId: createMovementDto.faenaId,
          assetId: createMovementDto.assetId,
          purchaseOrderId: createMovementDto.purchaseOrderId,
          notes: createMovementDto.notes,
          userId,
          lines: {
            create: createMovementDto.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitCost: line.unitCost,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      // 3. Update Stock
      for (const line of movement.lines) {
        const currentStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: movement.warehouseId,
            },
          },
        });

        const currentQty = currentStock ? Number(currentStock.quantity) : 0;
        const currentAvgCost = currentStock ? Number(currentStock.averageCost) : 0;
        const lineQty = Number(line.quantity);
        const lineCost = Number(line.unitCost);

        let newQuantity = currentQty;
        let newAverageCost = currentAvgCost;

        if (movement.type === MovementType.INGRESO) {
          newQuantity = currentQty + lineQty;
          // Recalculate average cost
          if (newQuantity > 0) {
            newAverageCost = ((currentQty * currentAvgCost) + (lineQty * lineCost)) / newQuantity;
          }
        } else if (movement.type === MovementType.SALIDA) {
          if (currentQty < lineQty) {
            throw new BadRequestException(`Insufficient stock for item ${line.itemId}`);
          }
          newQuantity = currentQty - lineQty;
        } else if (movement.type === MovementType.AJUSTE) {
          newQuantity = lineQty;
          newAverageCost = lineCost; // Optionally update average cost on adjustment
        }

        await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: movement.warehouseId,
            },
          },
          update: {
            quantity: newQuantity,
            averageCost: newAverageCost,
          },
          create: {
            itemId: line.itemId,
            warehouseId: movement.warehouseId,
            quantity: newQuantity,
            averageCost: newAverageCost,
          },
        });
      }

      return movement;
    });
  }

  async getStock() {
    const stocks = await this.prisma.stock.findMany({
      include: {
        warehouse: true,
        item: true,
      },
    });

    return stocks.map(stock => {
      const qty = Number(stock.quantity);
      return {
        ...stock,
        quantity: qty,
        averageCost: Number(stock.averageCost),
        lowStockWarning: qty <= stock.item.minimumStock,
      };
    });
  }

  async getKardex(itemId: string) {
    const lines = await this.prisma.warehouseMovementLine.findMany({
      where: { itemId },
      include: {
        movement: {
          include: {
            warehouse: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        movement: {
          createdAt: 'asc',
        },
      },
    });

    let cumulativeStock = 0;
    return lines.map(line => {
      const qty = Number(line.quantity);
      if (line.movement.type === MovementType.INGRESO) {
        cumulativeStock += qty;
      } else if (line.movement.type === MovementType.SALIDA) {
        cumulativeStock -= qty;
      } else if (line.movement.type === MovementType.AJUSTE) {
        cumulativeStock = qty;
      }

      return {
        ...line,
        quantity: qty,
        unitCost: Number(line.unitCost),
        balance: cumulativeStock,
      };
    });
  }
}
