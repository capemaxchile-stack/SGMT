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
    if (filters.warehouseId) {
      where.OR = [
        { warehouseId: filters.warehouseId },
        { targetWarehouseId: filters.warehouseId },
      ];
    }
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
        targetWarehouse: true,
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
        targetWarehouse: true,
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
    if (!createMovementDto.lines || createMovementDto.lines.length === 0) {
      throw new BadRequestException('Movement requires at least one line');
    }

    for (const line of createMovementDto.lines) {
      if (createMovementDto.type === MovementType.AJUSTE) {
        if (line.quantity < 0) {
          throw new BadRequestException('Quantity must be strictly positive or zero for adjustment');
        }
      } else {
        if (line.quantity <= 0) {
          throw new BadRequestException('Quantity must be strictly positive');
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Concurrency-safe folio generation
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'folio_MOV_' + dateStr}))`;
      } catch {
        // Safe fallback in test environments
      }

      const latest = await tx.warehouseMovement.findFirst({
        where: { movementNumber: { startsWith: `MOV-${dateStr}-` } },
        orderBy: { movementNumber: 'desc' },
        select: { movementNumber: true },
      });

      let nextNum = 1;
      if (latest && latest.movementNumber) {
        const parts = latest.movementNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      const seqStr = nextNum >= 10000 ? nextNum.toString() : nextNum.toString().padStart(4, '0');
      const movementNumber = `MOV-${dateStr}-${seqStr}`;

      const preparedLines: Array<{ itemId: string; quantity: Prisma.Decimal; unitCost: Prisma.Decimal }> = [];

      // 2. Handle atomic TRANSFER
      if (createMovementDto.type === MovementType.TRANSFER) {
        if (
          !createMovementDto.targetWarehouseId ||
          createMovementDto.targetWarehouseId === createMovementDto.warehouseId
        ) {
          throw new BadRequestException(
            'targetWarehouseId is required and must differ from origin warehouseId for TRANSFER movements',
          );
        }

        for (const line of createMovementDto.lines) {
          // Lock origin stock row with SELECT ... FOR UPDATE
          const originRows = await tx.$queryRaw<
            Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>
          >`
            SELECT id, quantity, "averageCost"
            FROM "Stock"
            WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${createMovementDto.warehouseId}
            FOR UPDATE
          `;

          const originRow = originRows[0];
          if (!originRow) {
            throw new BadRequestException(`Insufficient stock for item ${line.itemId}`);
          }

          const originQty = new Prisma.Decimal(originRow.quantity);
          const originAvgCost = new Prisma.Decimal(originRow.averageCost);
          const lineQty = new Prisma.Decimal(line.quantity);

          if (originQty.lessThan(lineQty)) {
            throw new BadRequestException(`Insufficient stock for item ${line.itemId}`);
          }

          const newOriginQty = originQty.minus(lineQty);
          // Outgoing transfer leaves origin at source warehouse PMP
          const transferUnitCost = originAvgCost;

          // Update origin stock
          await tx.stock.update({
            where: {
              itemId_warehouseId: {
                itemId: line.itemId,
                warehouseId: createMovementDto.warehouseId,
              },
            },
            data: {
              quantity: newOriginQty,
              averageCost: originAvgCost,
            },
          });

          // Lock destination stock row with SELECT ... FOR UPDATE
          const destRows = await tx.$queryRaw<
            Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>
          >`
            SELECT id, quantity, "averageCost"
            FROM "Stock"
            WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${createMovementDto.targetWarehouseId}
            FOR UPDATE
          `;

          let destRow = destRows[0];
          if (!destRow) {
            await tx.stock.upsert({
              where: {
                itemId_warehouseId: {
                  itemId: line.itemId,
                  warehouseId: createMovementDto.targetWarehouseId,
                },
              },
              update: {},
              create: {
                itemId: line.itemId,
                warehouseId: createMovementDto.targetWarehouseId,
                quantity: new Prisma.Decimal(0),
                averageCost: new Prisma.Decimal(0),
              },
            });

            const lockedDest = await tx.$queryRaw<
              Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>
            >`
              SELECT id, quantity, "averageCost"
              FROM "Stock"
              WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${createMovementDto.targetWarehouseId}
              FOR UPDATE
            `;
            destRow = lockedDest[0];
          }

          const destQty = destRow ? new Prisma.Decimal(destRow.quantity) : new Prisma.Decimal(0);
          const destAvgCost = destRow ? new Prisma.Decimal(destRow.averageCost) : new Prisma.Decimal(0);
          const newDestQty = destQty.plus(lineQty);
          let newDestAvgCost = destAvgCost;
          if (newDestQty.greaterThan(0)) {
            newDestAvgCost = destQty
              .times(destAvgCost)
              .plus(lineQty.times(transferUnitCost))
              .dividedBy(newDestQty);
          }

          // Update destination stock
          await tx.stock.update({
            where: {
              itemId_warehouseId: {
                itemId: line.itemId,
                warehouseId: createMovementDto.targetWarehouseId,
              },
            },
            data: {
              quantity: newDestQty,
              averageCost: newDestAvgCost,
            },
          });

          preparedLines.push({
            itemId: line.itemId,
            quantity: lineQty,
            unitCost: transferUnitCost,
          });
        }

        const movement = await tx.warehouseMovement.create({
          data: {
            type: MovementType.TRANSFER,
            movementNumber,
            warehouseId: createMovementDto.warehouseId,
            targetWarehouseId: createMovementDto.targetWarehouseId,
            faenaId: createMovementDto.faenaId,
            assetId: createMovementDto.assetId,
            purchaseOrderId: createMovementDto.purchaseOrderId,
            notes: createMovementDto.notes,
            userId,
            lines: {
              create: preparedLines.map((pl) => ({
                itemId: pl.itemId,
                quantity: pl.quantity,
                unitCost: pl.unitCost,
              })),
            },
          },
          include: {
            lines: true,
            warehouse: true,
            targetWarehouse: true,
          },
        });

        return movement;
      }

      // 3. Handle INGRESO, SALIDA, AJUSTE
      for (const line of createMovementDto.lines) {
        // Row-level lock on Stock row
        const rows = await tx.$queryRaw<
          Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>
        >`
          SELECT id, quantity, "averageCost"
          FROM "Stock"
          WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${createMovementDto.warehouseId}
          FOR UPDATE
        `;

        let stockRow = rows[0];
        if (!stockRow) {
          await tx.stock.upsert({
            where: {
              itemId_warehouseId: {
                itemId: line.itemId,
                warehouseId: createMovementDto.warehouseId,
              },
            },
            update: {},
            create: {
              itemId: line.itemId,
              warehouseId: createMovementDto.warehouseId,
              quantity: new Prisma.Decimal(0),
              averageCost: new Prisma.Decimal(0),
            },
          });

          const lockedRows = await tx.$queryRaw<
            Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>
          >`
            SELECT id, quantity, "averageCost"
            FROM "Stock"
            WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${createMovementDto.warehouseId}
            FOR UPDATE
          `;
          stockRow = lockedRows[0];
        }

        const currentQty = stockRow ? new Prisma.Decimal(stockRow.quantity) : new Prisma.Decimal(0);
        const currentAvgCost = stockRow ? new Prisma.Decimal(stockRow.averageCost) : new Prisma.Decimal(0);
        const lineQty = new Prisma.Decimal(line.quantity);

        let lineUnitCost: Prisma.Decimal;
        let newQuantity = currentQty;
        let newAverageCost = currentAvgCost;

        if (createMovementDto.type === MovementType.INGRESO) {
          lineUnitCost = new Prisma.Decimal(line.unitCost ?? 0);
          newQuantity = currentQty.plus(lineQty);
          if (newQuantity.greaterThan(0)) {
            if (currentQty.isZero()) {
              newAverageCost = lineUnitCost;
            } else {
              const currentTotal = currentQty.times(currentAvgCost);
              const incomingTotal = lineQty.times(lineUnitCost);
              newAverageCost = currentTotal.plus(incomingTotal).dividedBy(newQuantity);
            }
          }
        } else if (createMovementDto.type === MovementType.SALIDA) {
          if (currentQty.lessThan(lineQty)) {
            throw new BadRequestException(`Insufficient stock for item ${line.itemId}`);
          }
          // Automatically stamp active warehouse PMP regardless of client input
          lineUnitCost = currentAvgCost;
          newQuantity = currentQty.minus(lineQty);
          newAverageCost = currentAvgCost; // Preserved on SALIDA
        } else if (createMovementDto.type === MovementType.AJUSTE) {
          newQuantity = lineQty;
          // Preserve existing average cost unless positive unitCost is explicitly provided
          if (line.unitCost !== undefined && line.unitCost !== null && Number(line.unitCost) > 0) {
            lineUnitCost = new Prisma.Decimal(line.unitCost);
            newAverageCost = lineUnitCost;
          } else {
            lineUnitCost = currentAvgCost;
            newAverageCost = currentAvgCost;
          }
        } else {
          lineUnitCost = new Prisma.Decimal(line.unitCost ?? 0);
        }

        await tx.stock.update({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: createMovementDto.warehouseId,
            },
          },
          data: {
            quantity: newQuantity,
            averageCost: newAverageCost,
          },
        });

        preparedLines.push({
          itemId: line.itemId,
          quantity: lineQty,
          unitCost: lineUnitCost,
        });
      }

      // 4. Create Movement record + Lines
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
            create: preparedLines.map((pl) => ({
              itemId: pl.itemId,
              quantity: pl.quantity,
              unitCost: pl.unitCost,
            })),
          },
        },
        include: {
          lines: true,
          warehouse: true,
        },
      });

      return movement;
    });
  }

  async getStock(warehouseId?: string) {
    const where: Prisma.StockWhereInput = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        warehouse: true,
        item: true,
      },
    });

    return stocks.map((stock) => {
      const qty = Number(stock.quantity);
      return {
        ...stock,
        quantity: qty,
        averageCost: Number(stock.averageCost),
        lowStockWarning: qty <= (stock.item?.minimumStock ?? 0),
      };
    });
  }

  async getKardex(itemId: string, warehouseId?: string) {
    if (!warehouseId) {
      throw new BadRequestException('WarehouseId is strictly required');
    }

    const lines = await this.prisma.warehouseMovementLine.findMany({
      where: {
        itemId,
        movement: {
          OR: [
            { warehouseId },
            { targetWarehouseId: warehouseId },
          ],
        },
      },
      include: {
        movement: {
          include: {
            warehouse: true,
            targetWarehouse: true,
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

    let cumulativeStock = new Prisma.Decimal(0);
    return lines.map((line) => {
      const qty = new Prisma.Decimal(line.quantity);
      const unitCost = new Prisma.Decimal(line.unitCost);
      const mov = line.movement;

      if (mov.type === MovementType.INGRESO) {
        cumulativeStock = cumulativeStock.plus(qty);
      } else if (mov.type === MovementType.SALIDA) {
        cumulativeStock = cumulativeStock.minus(qty);
      } else if (mov.type === MovementType.AJUSTE) {
        cumulativeStock = qty;
      } else if (mov.type === MovementType.TRANSFER) {
        if (mov.warehouseId === warehouseId) {
          cumulativeStock = cumulativeStock.minus(qty);
        } else if (mov.targetWarehouseId === warehouseId) {
          cumulativeStock = cumulativeStock.plus(qty);
        }
      }

      return {
        ...line,
        quantity: qty.toNumber(),
        unitCost: unitCost.toNumber(),
        balance: cumulativeStock.toNumber(),
      };
    });
  }
}
