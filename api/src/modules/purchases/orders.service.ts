import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { OrderStatus, AuthorizationAction, AuthorizationEntityType, MovementType, RequestStatus, ReceptionDestination, QuotationStatus, Prisma } from '@prisma/client';
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
        purchaseRequest: {
          include: { faena: true, requester: { select: { id: true, name: true, email: true } } },
        },
        quotation: true,
        targetAsset: { select: { id: true, internalNumber: true, type: true } },
        workOrder: { select: { id: true, otNumber: true } },
        warehouseMovements: {
          select: { id: true, movementNumber: true, destination: true, type: true, createdAt: true },
        },
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
        purchaseRequest: {
          include: { faena: true, requester: { select: { id: true, name: true, email: true } } },
        },
        quotation: {
          include: { supplier: true, lines: { include: { item: true } } },
        },
        targetAsset: true,
        workOrder: true,
        warehouseMovements: {
          include: {
            warehouse: true,
            targetWarehouse: true,
            asset: true,
            lines: { include: { item: true } },
          },
        },
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
      let faenaId: string | null = createOrderDto.faenaId || null;

      // 1. If linked to a purchase request, validate and convert it
      if (createOrderDto.purchaseRequestId) {
        const req = await tx.purchaseRequest.findUnique({
          where: { id: createOrderDto.purchaseRequestId },
        });
        if (!req) {
          throw new NotFoundException(`Purchase request with id ${createOrderDto.purchaseRequestId} not found`);
        }
        if (req.status !== RequestStatus.APROBADA) {
          throw new BadRequestException(
            `Only APROBADA field requests can be converted to purchase order: La solicitud de compra vinculada (${req.requestNumber}) se encuentra en estado "${req.status}". Debe ser aprobada previamente antes de generar la Orden de Compra.`,
          );
        }

        if (!faenaId && req.faenaId) {
          faenaId = req.faenaId;
        }

        await tx.purchaseRequest.update({
          where: { id: req.id },
          data: { status: RequestStatus.CONVERTIDA },
        });
      }

      // 1.1 If linked to quotation, mark quotation as SELECCIONADA
      if (createOrderDto.quotationId) {
        await tx.quotation.update({
          where: { id: createOrderDto.quotationId },
          data: { status: QuotationStatus.SELECCIONADA },
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
      return tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: createOrderDto.supplierId,
          purchaseRequestId: createOrderDto.purchaseRequestId,
          quotationId: createOrderDto.quotationId,
          faenaId,
          receptionDestination: createOrderDto.receptionDestination || ReceptionDestination.BODEGA,
          targetAssetId: createOrderDto.targetAssetId,
          workOrderId: createOrderDto.workOrderId,
          deliveryTerms: createOrderDto.deliveryTerms,
          estimatedDeliveryDate: createOrderDto.estimatedDeliveryDate ? new Date(createOrderDto.estimatedDeliveryDate) : null,
          totalAmount,
          status: OrderStatus.PENDIENTE_APROBACION,
          lines: {
            create: createOrderDto.lines.map((line) => {
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
    });

    // Realtime background alert dispatch
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

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  }

  async receiveOrder(id: string, receiveDto: ReceiveOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock PurchaseOrder row
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
        throw new BadRequestException(`Cannot move Purchase Order from ${orderRow.status} to reception`);
      }

      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: true, purchaseRequest: true },
      });

      if (!order) {
        throw new NotFoundException(`Purchase order with id ${id} not found`);
      }

      const targetDestination = receiveDto.destination || order.receptionDestination || ReceptionDestination.BODEGA;

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

      // Resolve warehouse fallback if not supplied (for direct to asset or garita)
      let resolvedWarehouseId = receiveDto.warehouseId;
      if (!resolvedWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst({ where: { isActive: true } });
        if (!defaultWh && targetDestination === ReceptionDestination.BODEGA) {
          throw new BadRequestException('A valid warehouseId is required for warehouse bin reception');
        }
        resolvedWarehouseId = defaultWh?.id || '00000000-0000-0000-0000-000000000000';
      }

      // ==========================================
      // Scenario A: Garita de Entrada (Transit checkpoint)
      // ==========================================
      if (targetDestination === ReceptionDestination.GARITA_TRANSITO) {
        const gateTicket = receiveDto.gateTicketNumber || `GT-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

        const movement = await tx.warehouseMovement.create({
          data: {
            type: MovementType.INGRESO,
            destination: ReceptionDestination.GARITA_TRANSITO,
            movementNumber,
            warehouseId: resolvedWarehouseId,
            purchaseOrderId: order.id,
            userId,
            gateTicketNumber: gateTicket,
            receivedAtGateAt: new Date(),
            notes: receiveDto.notes || `Recepción en garita de faena (Ticket: ${gateTicket}) para OC ${order.orderNumber}. En tránsito a bodega.`,
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

        await tx.purchaseOrder.update({
          where: { id },
          data: {
            receptionDestination: ReceptionDestination.GARITA_TRANSITO,
            gateTicketNumber: gateTicket,
            gateEntryDate: new Date(),
            status: OrderStatus.RECEPCION_PARCIAL,
          },
        });

        return movement;
      }

      // ==========================================
      // Scenario B: Entrega Directa a Activo / OT en Terreno
      // ==========================================
      if (targetDestination === ReceptionDestination.ACTIVO_DIRECTO) {
        const targetAssetId = receiveDto.targetAssetId || order.targetAssetId;
        if (!targetAssetId) {
          throw new BadRequestException('Direct terrain reception requires targetAssetId for the designated machinery');
        }

        const workOrderId = receiveDto.workOrderId || order.workOrderId;

        const movement = await tx.warehouseMovement.create({
          data: {
            type: MovementType.SALIDA,
            destination: ReceptionDestination.ACTIVO_DIRECTO,
            movementNumber,
            warehouseId: resolvedWarehouseId,
            assetId: targetAssetId,
            workOrderId: workOrderId || undefined,
            purchaseOrderId: order.id,
            userId,
            notes: receiveDto.notes || `Entrega directa a maquinaria/activo ${targetAssetId} en terreno para OC ${order.orderNumber}`,
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

        await tx.purchaseOrder.update({
          where: { id },
          data: {
            receptionDestination: ReceptionDestination.ACTIVO_DIRECTO,
            targetAssetId,
            workOrderId: workOrderId || undefined,
            status: OrderStatus.RECEPCION_TOTAL,
          },
        });

        return movement;
      }

      // ==========================================
      // Scenario C: Ingreso Estándar a Bodega Central o Faena
      // ==========================================
      const movement = await tx.warehouseMovement.create({
        data: {
          type: MovementType.INGRESO,
          destination: ReceptionDestination.BODEGA,
          movementNumber,
          warehouseId: resolvedWarehouseId,
          purchaseOrderId: order.id,
          userId,
          notes: receiveDto.notes || `Recepción en bodega de OC ${order.orderNumber}`,
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

      // Update Stock with Row-Level Lock & Weighted Average Cost
      for (const line of movement.lines) {
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

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          receptionDestination: ReceptionDestination.BODEGA,
          status: OrderStatus.RECEPCION_TOTAL,
        },
      });

      return movement;
    });
  }

  async getTimeline(orderId: string) {
    const order = await this.findOne(orderId);

    // Retrieve authorizations for this PO
    const authorizations = await this.prisma.authorization.findMany({
      where: {
        entityType: AuthorizationEntityType.PURCHASE_ORDER,
        entityId: orderId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const events: Array<{
      step: number;
      phase: string;
      title: string;
      description: string;
      timestamp: Date;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REJECTED';
      badge?: string;
      meta?: Record<string, any>;
    }> = [];

    // 1. Solicitud de Pedido (if linked)
    if (order.purchaseRequest) {
      events.push({
        step: 1,
        phase: 'SOLICITUD',
        title: `Solicitud de Pedido ${order.purchaseRequest.requestNumber}`,
        description: `Creada por ${order.purchaseRequest.requester?.name || 'Usuario'} en faena ${order.purchaseRequest.faena?.name || 'Faena'}. Justificación: "${order.purchaseRequest.justification}"`,
        timestamp: order.purchaseRequest.createdAt,
        status: 'COMPLETED',
        badge: order.purchaseRequest.status,
      });
    }

    // 2. Cotización (if linked)
    if (order.quotation) {
      events.push({
        step: 2,
        phase: 'COTIZACIONES',
        title: `Cotización ${order.quotation.quotationNumber}`,
        description: `Cotizado por proveedor ${order.quotation.supplier.businessName}. Monto total: $${Number(order.quotation.totalAmount).toLocaleString('es-CL')}`,
        timestamp: order.quotation.createdAt,
        status: 'COMPLETED',
        badge: order.quotation.status,
      });
    }

    // 3. Emisión de Orden de Compra
    events.push({
      step: 3,
      phase: 'ORDEN_COMPRA',
      title: `Orden de Compra ${order.orderNumber} creada`,
      description: `Monto total: $${Number(order.totalAmount).toLocaleString('es-CL')} CLP con proveedor ${order.supplier.businessName}. Términos: ${order.deliveryTerms || 'N/A'}`,
      timestamp: order.createdAt,
      status: 'COMPLETED',
      badge: order.status,
    });

    // 4. Aprobación y Autorizaciones
    if (authorizations.length > 0) {
      for (const auth of authorizations) {
        events.push({
          step: 4,
          phase: 'AUTORIZACION',
          title: `Autorización Nivel ${auth.level} (${auth.action})`,
          description: `Evaluada por ${auth.user.name}. ${auth.comments ? 'Comentarios: "' + auth.comments + '".' : ''} ${auth.exceptionReason ? 'Razón de excepción: "' + auth.exceptionReason + '".' : ''}`,
          timestamp: auth.createdAt,
          status: auth.action === AuthorizationAction.RECHAZADA ? 'REJECTED' : 'COMPLETED',
          badge: auth.action,
        });
      }
    } else {
      events.push({
        step: 4,
        phase: 'AUTORIZACION',
        title: 'Revisión y Aprobación Gerencial',
        description: order.status === OrderStatus.PENDIENTE_APROBACION ? 'Pendiente de autorización según umbrales de monto' : 'Aprobada sin registro previo',
        timestamp: order.updatedAt,
        status: order.status === OrderStatus.PENDIENTE_APROBACION ? 'IN_PROGRESS' : 'COMPLETED',
      });
    }

    // 5. Recepción en Garita de Faena
    if (order.gateTicketNumber || order.warehouseMovements.some((m) => m.destination === ReceptionDestination.GARITA_TRANSITO)) {
      events.push({
        step: 5,
        phase: 'GARITA_TRANSITO',
        title: `Control de Acceso en Garita (Ticket: ${order.gateTicketNumber || 'S/N'})`,
        description: `Carga ingresó a la faena por garita. Fecha de control: ${order.gateEntryDate ? order.gateEntryDate.toLocaleDateString('es-CL') : 'Registrada'}`,
        timestamp: order.gateEntryDate || order.updatedAt,
        status: 'COMPLETED',
        badge: 'GARITA_REGISTRADA',
      });
    }

    // 6. Ingreso a Bodega o Despacho a Activo
    const completedMovements = order.warehouseMovements.filter(
      (m) => m.destination === ReceptionDestination.BODEGA || m.destination === ReceptionDestination.ACTIVO_DIRECTO,
    );

    if (completedMovements.length > 0) {
      for (const m of completedMovements) {
        const isDirect = m.destination === ReceptionDestination.ACTIVO_DIRECTO;
        events.push({
          step: 6,
          phase: isDirect ? 'ENTREGA_TERRENO' : 'INGRESO_BODEGA',
          title: isDirect ? `Entrega Directa a Terreno (${m.movementNumber})` : `Ingreso a Bodega Central/Faena (${m.movementNumber})`,
          description: isDirect
            ? `Repuestos entregados directamente a la máquina ${m.asset?.internalNumber || 'Asignada'} en faena sin almacenaje intermedio.`
            : `Mercadería recepcionada en ${m.warehouse.name}. Stock de inventario y costo promedio ponderado actualizados.`,
          timestamp: m.createdAt,
          status: 'COMPLETED',
          badge: m.destination,
        });
      }
    } else {
      events.push({
        step: 6,
        phase: 'INGRESO_BODEGA',
        title: 'Recepción y Entrada a Bodega / Activo',
        description: order.status === OrderStatus.EMITIDA || order.status === OrderStatus.RECEPCION_PARCIAL
          ? 'Mercadería en camino o en garita de control pendiente de ingreso físico'
          : 'A la espera de emisión y despacho del proveedor',
        timestamp: order.updatedAt,
        status: order.status === OrderStatus.EMITIDA || order.status === OrderStatus.RECEPCION_PARCIAL ? 'IN_PROGRESS' : 'PENDING',
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      supplier: order.supplier.businessName,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      destination: order.receptionDestination,
      timeline: events,
    };
  }

  async getPendingWarehouseReception() {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { status: OrderStatus.EMITIDA },
          { status: OrderStatus.RECEPCION_PARCIAL },
          { receptionDestination: ReceptionDestination.GARITA_TRANSITO },
        ],
      },
      include: {
        supplier: true,
        lines: { include: { item: true } },
        purchaseRequest: { include: { faena: true } },
        warehouseMovements: { select: { movementNumber: true, destination: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return orders.map((o) => {
      const isOverdue = o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) < now : false;
      const daysSinceCreation = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        supplierName: o.supplier.businessName,
        supplierRut: o.supplier.rut,
        status: o.status,
        receptionDestination: o.receptionDestination,
        gateTicketNumber: o.gateTicketNumber,
        gateEntryDate: o.gateEntryDate,
        totalAmount: Number(o.totalAmount),
        estimatedDeliveryDate: o.estimatedDeliveryDate,
        isOverdue,
        daysSinceCreation,
        faenaName: o.purchaseRequest?.faena?.name || 'Faena Central',
        itemCount: o.lines.length,
        lines: o.lines.map((l) => ({
          itemCode: l.item.code,
          itemDescription: l.item.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      };
    });
  }
}
