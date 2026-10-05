import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { OrderStatus, AuthorizationAction, AuthorizationEntityType, MovementType, RequestStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.BORRADOR]: [OrderStatus.PENDIENTE_APROBACION, OrderStatus.CANCELADA],
  [OrderStatus.PENDIENTE_APROBACION]: [
    OrderStatus.APROBADA,
    OrderStatus.APROBADA_EXCEPCION,
    OrderStatus.RECHAZADA,
    OrderStatus.CANCELADA,
  ],
  [OrderStatus.APROBADA]: [OrderStatus.EMITIDA, OrderStatus.RECEPCION_TOTAL, OrderStatus.CANCELADA],
  [OrderStatus.APROBADA_EXCEPCION]: [OrderStatus.EMITIDA, OrderStatus.RECEPCION_TOTAL, OrderStatus.CANCELADA],
  [OrderStatus.EMITIDA]: [OrderStatus.RECEPCION_PARCIAL, OrderStatus.RECEPCION_TOTAL, OrderStatus.CANCELADA],
  [OrderStatus.RECEPCION_PARCIAL]: [OrderStatus.RECEPCION_TOTAL, OrderStatus.CANCELADA],
  [OrderStatus.RECEPCION_TOTAL]: [],
  [OrderStatus.RECHAZADA]: [],
  [OrderStatus.CANCELADA]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly channelsService?: NotificationChannelsService,
  ) {}

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
    if (!createOrderDto.lines || createOrderDto.lines.length === 0) {
      throw new BadRequestException('Purchase Order requires at least one line');
    }

    for (const line of createOrderDto.lines) {
      if (line.quantity <= 0 || line.unitPrice < 0) {
        throw new BadRequestException('Line quantity must be > 0 and price >= 0');
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. If linked to a purchase request, validate and convert it
      if (createOrderDto.purchaseRequestId) {
        const req = await tx.purchaseRequest.findUnique({
          where: { id: createOrderDto.purchaseRequestId },
        });
        if (!req) {
          throw new NotFoundException(`Purchase request with id ${createOrderDto.purchaseRequestId} not found`);
        }
        if (req.status !== RequestStatus.APROBADA) {
          throw new BadRequestException('Only APROBADA field requests can be converted to purchase order');
        }

        // Mark as CONVERTIDA
        await tx.purchaseRequest.update({
          where: { id: req.id },
          data: { status: RequestStatus.CONVERTIDA },
        });
      }

      // 2. High precision total amount calculation
      const totalAmount = createOrderDto.lines.reduce(
        (sum, line) => sum.plus(new Prisma.Decimal(line.quantity).times(new Prisma.Decimal(line.unitPrice))),
        new Prisma.Decimal(0),
      );

      // 3. Concurrency-safe folio generation
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'folio_OC_' + dateStr}))`;
      } catch {
        // Safe fallback in test environments
      }

      const latest = await tx.purchaseOrder.findFirst({
        where: { orderNumber: { startsWith: `OC-${dateStr}-` } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });

      let nextSeq = 1;
      if (latest && latest.orderNumber) {
        const parts = latest.orderNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextSeq = lastNum + 1;
        }
      }
      const seqStr = nextSeq >= 10000 ? nextSeq.toString() : nextSeq.toString().padStart(4, '0');
      const orderNumber = `OC-${dateStr}-${seqStr}`;

      // 4. Create Order
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
            create: createOrderDto.lines.map(line => {
              const qty = new Prisma.Decimal(line.quantity);
              const price = new Prisma.Decimal(line.unitPrice);
              return {
                itemId: line.itemId,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty.times(price),
              };
            }),
          },
        },
        include: {
          lines: true,
        },
      });

      return order;
    });

    // Realtime background alert dispatch to Telegram, Brevo, and Webhook
    this.prisma.supplier
      .findUnique({ where: { id: order.supplierId } })
      .then((sup) => {
        this.channelsService?.dispatchSystemAlert({
          event: 'pendingApprovals',
          title: `Nueva Orden de Compra Pendiente (${order.orderNumber})`,
          summary: `Se ha emitido la orden ${order.orderNumber} por un monto de $${Number(order.totalAmount).toLocaleString('es-CL')} CLP con el proveedor ${sup?.businessName || 'Proveedor'}.\nRequiere autorización de gerencia.`,
          link: '/compras',
          details: { orderNumber: order.orderNumber, totalAmount: order.totalAmount },
        });
      })
      .catch(() => {});

    return order;
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      // Determine target status
      let newStatus: OrderStatus;
      if (updateDto.action === AuthorizationAction.APROBADA) {
        newStatus = OrderStatus.APROBADA;
      } else if (updateDto.action === AuthorizationAction.RECHAZADA) {
        newStatus = OrderStatus.RECHAZADA;
      } else if (updateDto.action === AuthorizationAction.EXCEPCION) {
        newStatus = OrderStatus.APROBADA_EXCEPCION;
      } else if (updateDto.status) {
        newStatus = updateDto.status;
      } else {
        throw new BadRequestException('Invalid transition: No action or status provided');
      }

      // 1. Strict FSM validations
      if (
        order.status === OrderStatus.RECHAZADA ||
        order.status === OrderStatus.RECEPCION_TOTAL ||
        order.status === OrderStatus.CANCELADA
      ) {
        throw new BadRequestException(`Cannot move Purchase Order from ${order.status}`);
      }

      const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(`Cannot move Purchase Order from ${order.status} to ${newStatus}`);
      }

      // 2. Validate Monetary Approval Limit for APROBADA
      if (newStatus === OrderStatus.APROBADA) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: { role: true },
            },
          },
        });
        if (!user) {
          throw new NotFoundException(`User with id ${userId} not found`);
        }

        let isUnlimited = false;
        let highestLimit: Prisma.Decimal | null = null;
        for (const userRole of user.roles) {
          if (userRole.role.maxApprovalAmount === null) {
            isUnlimited = true;
            break;
          }
          const limit = new Prisma.Decimal(userRole.role.maxApprovalAmount);
          if (!highestLimit || limit.greaterThan(highestLimit)) {
            highestLimit = limit;
          }
        }

        if (!isUnlimited) {
          if (!highestLimit || new Prisma.Decimal(order.totalAmount).greaterThan(highestLimit)) {
            throw new BadRequestException(
              `ApprovalLimitExceeded: El monto total (${order.totalAmount}) excede el límite de aprobación asignado`,
            );
          }
        }
      }

      // 3. Validate superKey for APROBADA_EXCEPCION
      if (newStatus === OrderStatus.APROBADA_EXCEPCION) {
        if (!updateDto.superKey || !updateDto.superKey.trim()) {
          throw new UnauthorizedException('Invalid or missing superKey');
        }
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || !user.superKeyHash) {
          throw new UnauthorizedException('Invalid or missing superKey: Clave de Súper Usuario no configurada');
        }
        const isValid = await bcrypt.compare(updateDto.superKey, user.superKeyHash);
        if (!isValid) {
          throw new UnauthorizedException('Invalid or missing superKey: Clave de Súper Usuario incorrecta');
        }
      }

      // 4. Create Authorization Record
      const action = updateDto.action || (
        newStatus === OrderStatus.APROBADA
          ? AuthorizationAction.APROBADA
          : newStatus === OrderStatus.APROBADA_EXCEPCION
          ? AuthorizationAction.EXCEPCION
          : AuthorizationAction.RECHAZADA
      );

      await tx.authorization.create({
        data: {
          entityType: AuthorizationEntityType.PURCHASE_ORDER,
          entityId: id,
          userId,
          action,
          level: updateDto.level ?? 1,
          comments: updateDto.comments,
          exceptionReason: updateDto.exceptionReason,
        },
      });

      // 5. Update Order Status
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  }

  async receiveOrder(id: string, receiveDto: ReceiveOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the PurchaseOrder row to prevent concurrent duplicate receptions
      const [orderRow] = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>`
        SELECT id, status FROM "PurchaseOrder" WHERE id = ${id} FOR UPDATE
      `;

      if (!orderRow) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      if (
        orderRow.status === OrderStatus.RECEPCION_TOTAL ||
        orderRow.status === OrderStatus.RECHAZADA ||
        orderRow.status === OrderStatus.CANCELADA
      ) {
        throw new BadRequestException(`Cannot move Purchase Order from ${orderRow.status}`);
      }

      if (
        orderRow.status !== OrderStatus.APROBADA &&
        orderRow.status !== OrderStatus.APROBADA_EXCEPCION &&
        orderRow.status !== OrderStatus.EMITIDA &&
        orderRow.status !== OrderStatus.RECEPCION_PARCIAL
      ) {
        throw new BadRequestException(`Cannot move Purchase Order from ${orderRow.status} to RECEPCION_TOTAL`);
      }

      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!order) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      // 2. Concurrency-safe folio generation for Movement
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'folio_MOV_' + dateStr}))`;
      } catch {
        // Safe fallback in test environments
      }

      const latestMov = await tx.warehouseMovement.findFirst({
        where: { movementNumber: { startsWith: `MOV-${dateStr}-` } },
        orderBy: { movementNumber: 'desc' },
        select: { movementNumber: true },
      });

      let nextNum = 1;
      if (latestMov && latestMov.movementNumber) {
        const parts = latestMov.movementNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      const seqStr = nextNum >= 10000 ? nextNum.toString() : nextNum.toString().padStart(4, '0');
      const movementNumber = `MOV-${dateStr}-${seqStr}`;

      // 3. Create Movement (INGRESO)
      const movement = await tx.warehouseMovement.create({
        data: {
          type: MovementType.INGRESO,
          movementNumber,
          warehouseId: receiveDto.warehouseId,
          purchaseOrderId: order.id,
          userId,
          notes: receiveDto.notes || `Recepción automática de OC ${order.orderNumber}`,
          lines: {
            create: order.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitCost: line.unitPrice,
            })),
          },
        },
        include: { lines: true },
      });

      // 4. Update Stock with Row-Level Lock & Decimal Precision
      for (const line of movement.lines) {
        // Lock stock row with SELECT ... FOR UPDATE
        const rows = await tx.$queryRaw<Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>>`
          SELECT id, quantity, "averageCost"
          FROM "Stock"
          WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${movement.warehouseId}
          FOR UPDATE
        `;

        let stockRow = rows[0];
        if (!stockRow) {
          await tx.stock.upsert({
            where: {
              itemId_warehouseId: {
                itemId: line.itemId,
                warehouseId: movement.warehouseId,
              },
            },
            update: {},
            create: {
              itemId: line.itemId,
              warehouseId: movement.warehouseId,
              quantity: new Prisma.Decimal(0),
              averageCost: new Prisma.Decimal(0),
            },
          });

          const lockedRows = await tx.$queryRaw<Array<{ id: string; quantity: Prisma.Decimal; averageCost: Prisma.Decimal }>>`
            SELECT id, quantity, "averageCost"
            FROM "Stock"
            WHERE "itemId" = ${line.itemId} AND "warehouseId" = ${movement.warehouseId}
            FOR UPDATE
          `;
          stockRow = lockedRows[0];
        }

        const currentQty = stockRow ? new Prisma.Decimal(stockRow.quantity) : new Prisma.Decimal(0);
        const currentAvgCost = stockRow ? new Prisma.Decimal(stockRow.averageCost) : new Prisma.Decimal(0);
        const lineQty = new Prisma.Decimal(line.quantity);
        const lineCost = new Prisma.Decimal(line.unitCost);

        const newQuantity = currentQty.plus(lineQty);
        let newAverageCost = currentAvgCost;
        if (newQuantity.greaterThan(0)) {
          const currentTotal = currentQty.times(currentAvgCost);
          const incomingTotal = lineQty.times(lineCost);
          newAverageCost = currentTotal.plus(incomingTotal).dividedBy(newQuantity);
        }

        await tx.stock.update({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: movement.warehouseId,
            },
          },
          data: {
            quantity: newQuantity,
            averageCost: newAverageCost,
          },
        });
      }

      // 5. Update Order Status to terminal RECEPCION_TOTAL
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: OrderStatus.RECEPCION_TOTAL },
      });

      return movement;
    });
  }
}
