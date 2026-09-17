import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { OrderStatus, AuthorizationAction, AuthorizationEntityType, MovementType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: OrderStatus, supplierId?: string) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        lines: {
          include: { item: true },
        },
        purchaseRequest: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: { include: { item: true } },
        purchaseRequest: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase order with id ${id} not found`);
    }

    return order;
  }

  async create(createOrderDto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate total amount
      const totalAmount = createOrderDto.lines.reduce(
        (sum, line) => sum + line.quantity * line.unitPrice,
        0,
      );

      // 2. Generate order number
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const count = await tx.purchaseOrder.count({
        where: { orderNumber: { startsWith: `OC-${dateStr}` } },
      });
      const nextNum = (count + 1).toString().padStart(4, '0');
      const orderNumber = `OC-${dateStr}-${nextNum}`;

      // 3. Create the order
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: createOrderDto.supplierId,
          purchaseRequestId: createOrderDto.purchaseRequestId,
          deliveryTerms: createOrderDto.deliveryTerms,
          estimatedDeliveryDate: createOrderDto.estimatedDeliveryDate ? new Date(createOrderDto.estimatedDeliveryDate) : null,
          totalAmount,
          status: OrderStatus.PENDIENTE_APROBACION,
          lines: {
            create: createOrderDto.lines.map(line => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.quantity * line.unitPrice,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      return order;
    });
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      if (updateDto.action === AuthorizationAction.EXCEPCION) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || !user.superKeyHash || !updateDto.superKey) {
          throw new UnauthorizedException('Clave de Súper Usuario inválida o no configurada');
        }
        const isValid = await bcrypt.compare(updateDto.superKey, user.superKeyHash);
        if (!isValid) {
          throw new UnauthorizedException('Clave de Súper Usuario inválida o no configurada');
        }
      }

      // 1. Create Authorization Record
      await tx.authorization.create({
        data: {
          entityType: AuthorizationEntityType.PURCHASE_ORDER,
          entityId: id,
          userId,
          action: updateDto.action,
          level: updateDto.level ?? 1,
          comments: updateDto.comments,
          exceptionReason: updateDto.exceptionReason,
        },
      });

      // 2. Update Order Status
      let newStatus = order.status;
      if (updateDto.action === AuthorizationAction.APROBADA) {
        newStatus = OrderStatus.APROBADA;
      } else if (updateDto.action === AuthorizationAction.RECHAZADA) {
        newStatus = OrderStatus.RECHAZADA;
      } else if (updateDto.action === AuthorizationAction.EXCEPCION) {
        newStatus = OrderStatus.APROBADA_EXCEPCION;
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  }

  async receiveOrder(id: string, receiveDto: ReceiveOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!order) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      if (order.status !== OrderStatus.APROBADA && order.status !== OrderStatus.APROBADA_EXCEPCION && order.status !== OrderStatus.EMITIDA && order.status !== OrderStatus.RECEPCION_PARCIAL) {
        throw new BadRequestException(`Cannot receive order with status ${order.status}`);
      }

      // 1. Auto-generate movement number
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const count = await tx.warehouseMovement.count({
        where: { movementNumber: { startsWith: `MOV-${dateStr}` } },
      });
      const nextNum = (count + 1).toString().padStart(4, '0');
      const movementNumber = `MOV-${dateStr}-${nextNum}`;

      // 2. Create Movement (INGRESO)
      const movement = await tx.warehouseMovement.create({
        data: {
          type: MovementType.INGRESO,
          movementNumber,
          warehouseId: receiveDto.warehouseId,
          purchaseOrderId: order.id,
          userId,
          notes: receiveDto.notes || `Recepción automática de OC ${order.orderNumber}`,
          lines: {
            create: order.lines.map(line => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitCost: line.unitPrice,
            })),
          },
        },
        include: { lines: true },
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

        const newQuantity = currentQty + lineQty;
        let newAverageCost = currentAvgCost;
        if (newQuantity > 0) {
          newAverageCost = ((currentQty * currentAvgCost) + (lineQty * lineCost)) / newQuantity;
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

      // 4. Update Order Status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: OrderStatus.RECEPCION_TOTAL },
      });

      return movement;
    });
  }
}
